const { test, describe } = require("node:test");
const assert = require("node:assert");

const shared = require("../shared/dist/index.js");
const xpManager = require("../bot/dist/modules/leveling/xpManager.js");
const afkBatch = require("../bot/dist/utils/afkBatch.js");
const voteStore = require("../bot/dist/modules/suggestions/voteStore.js");
const scheduler = require("../bot/dist/scheduler/scheduler.js");
const metrics = require("../bot/dist/utils/metrics.js");
const { buildMessageContext } = require("../bot/dist/utils/messageContext.js");
const eventRouter = require("../bot/dist/utils/eventRouter.js");

// ---------- أدوات وهمية ----------
function makeMember(uid, guild) {
  const calls = { add: 0, remove: 0 };
  return {
    calls,
    user: { id: uid, username: `u${uid}`, tag: `u${uid}#1`, displayAvatarURL: () => "" },
    roles: {
      cache: { has: () => false, hasAny: () => false },
      add: async () => { calls.add++; },
      remove: async () => { calls.remove++; }
    },
    guild
  };
}

function makeGuild(gid) {
  const guild = {
    id: gid,
    name: "g",
    memberCount: 10,
    iconURL: () => null,
    members: { cache: new Map(), fetch: async (id) => guild.members.cache.get(id) ?? null }
  };
  return guild;
}

function makeChannel() {
  return { sent: 0, isTextBased: () => true, send: async function () { this.sent++; return {}; } };
}

function makeMessage(guild, member, uid, channelId) {
  return {
    guild,
    author: { id: uid },
    member,
    channelId,
    channel: {}
  };
}

function baseLeveling(overrides = {}) {
  return {
    enabled: true,
    messageCooldownSeconds: 0,
    xpPerMessage: { min: 1, max: 1 },
    xpPerVoiceMinute: 5,
    ignoredChannelIds: [],
    ignoredRoleIds: [],
    roleRewards: [],
    levelUpMessage: { enabled: false },
    announceInChannel: false,
    ...overrides
  };
}

describe("Phase0: XP batching — بلا كتابة لكل رسالة", () => {
  test("1000 رسالة → صفر عمليات DB قبل التفريغ، وكتابة محدودة بعده", async () => {
    xpManager.clearXpState();
    let finds = 0, creates = 0, saves = 0;
    const origFind = shared.LevelUser.find;
    const origCreate = shared.LevelUser.create;
    shared.LevelUser.find = async () => { finds++; return []; };
    shared.LevelUser.create = async ({ guildId, userId }) => {
      creates++;
      return { guildId, userId, totalXp: 0, level: 0, xp: 0, voiceMinutes: 0, save: async () => { saves++; } };
    };
    try {
      const guild = makeGuild("g1");
      const channel = makeChannel();
      const gConfig = { leveling: baseLeveling() };
      const client = {
        guilds: { cache: new Map([["g1", guild]]) },
        channels: { cache: new Map([["ch1", channel]]) },
        // كاش جاهز حتى لا يلمس التفريغ قاعدة البيانات للإعدادات
        guildConfigCache: new Map([["g1", { data: gConfig, expiresAt: Date.now() + 60000 }]])
      };

      // 100 مستخدم × 10 رسائل = 1000 رسالة
      for (let u = 0; u < 100; u++) {
        const uid = `user${u}`;
        const member = makeMember(uid, guild);
        guild.members.cache.set(uid, member);
        for (let m = 0; m < 10; m++) {
          await xpManager.handleMessageXp(client, makeMessage(guild, member, uid, "ch1"), gConfig);
        }
      }

      // قبل التفريغ: صفر عمليات قاعدة بيانات (مقابل ~1000 قراءة + 1000 كتابة في النظام القديم)
      assert.equal(finds, 0, "يجب ألا توجد قراءات قبل التفريغ");
      assert.equal(creates, 0, "يجب ألا توجد كتابات قبل التفريغ");
      assert.equal(xpManager.getPendingXpCount(), 100);

      await xpManager.flushXp(client);

      // بعد التفريغ: قراءة جماعية واحدة + إنشاء/حفظ لكل مستخدم نشط فقط
      assert.equal(finds, 1);
      assert.equal(creates, 100);
      assert.equal(saves, 100);
      assert.equal(xpManager.getPendingXpCount(), 0);
    } finally {
      shared.LevelUser.find = origFind;
      shared.LevelUser.create = origCreate;
      xpManager.clearXpState();
    }
  });

  test("الترقية تُعلن مرة واحدة فقط ولا تتكرر", async () => {
    xpManager.clearXpState();
    const origFind = shared.LevelUser.find;
    const origCreate = shared.LevelUser.create;
    shared.LevelUser.find = async () => [];
    shared.LevelUser.create = async ({ guildId, userId }) => ({
      guildId, userId, totalXp: 0, level: 0, xp: 0, voiceMinutes: 0, save: async () => {}
    });
    try {
      const guild = makeGuild("g1");
      const member = makeMember("hero", guild);
      guild.members.cache.set("hero", member);
      const channel = makeChannel();
      const gConfig = {
        leveling: baseLeveling({
          xpPerMessage: { min: 150, max: 150 },
          levelUpMessage: { enabled: true },
          roleRewards: [{ level: 1, roleId: "r1", removePrevious: false }]
        })
      };
      const client = {
        guilds: { cache: new Map([["g1", guild]]) },
        channels: { cache: new Map([["ch1", channel]]) },
        guildConfigCache: new Map([["g1", { data: gConfig, expiresAt: Date.now() + 60000 }]])
      };

      await xpManager.handleMessageXp(client, makeMessage(guild, member, "hero", "ch1"), gConfig);
      await xpManager.flushXp(client);
      assert.equal(channel.sent, 1, "إعلان ترقية واحد");
      assert.equal(member.calls.add, 1, "منح رتبة واحدة");

      // تفريغ ثانٍ بلا معلق → لا إعلان مكرر
      await xpManager.flushXp(client);
      assert.equal(channel.sent, 1, "لا تكرار لإعلان الترقية");
    } finally {
      shared.LevelUser.find = origFind;
      shared.LevelUser.create = origCreate;
      xpManager.clearXpState();
    }
  });
});

describe("Phase0: AFK batching — بلا N×update", () => {
  test("100 منشن → صفر كتابة فورية، وتحديث واحد لكل مستخدم عند التفريغ", async () => {
    afkBatch.clearAfkState();
    const calls = [];
    const origUpdate = shared.AfkUser.updateOne;
    shared.AfkUser.updateOne = async (filter, update) => { calls.push({ filter, update }); };
    try {
      for (let u = 0; u < 10; u++) {
        for (let m = 0; m < 10; m++) {
          afkBatch.recordAfkMention("g1", `user${u}`);
        }
      }
      assert.equal(calls.length, 0, "يجب ألا توجد كتابة قبل التفريغ");
      await afkBatch.flushAfkMentions();
      assert.equal(calls.length, 10, "تحديث واحد لكل مستخدم");
      for (const c of calls) {
        assert.equal(c.update.$inc.mentionCount, 10);
      }
      assert.equal(afkBatch.pendingAfkCount(), 0);
    } finally {
      shared.AfkUser.updateOne = origUpdate;
      afkBatch.clearAfkState();
    }
  });
});

describe("Phase0: Suggestion voting — بلا إعادة كتابة المصفوفة لكل ضغطة", () => {
  test("20 ضغطة سريعة → قراءة واحدة وحفظ واحد بعد التفريغ", async () => {
    voteStore.clearVoteState();
    let finds = 0, updates = 0;
    let stored = { upvotes: [], downvotes: [], status: "pending" };
    const origFindOne = shared.Suggestion.findOne;
    const origUpdate = shared.Suggestion.findOneAndUpdate;
    shared.Suggestion.findOne = async () => { finds++; return { ...stored }; };
    shared.Suggestion.findOneAndUpdate = async (filter, update) => {
      updates++;
      stored = { ...stored, ...update.$set };
      return null;
    };
    try {
      let last;
      for (let i = 0; i < 20; i++) {
        last = await voteStore.toggleVote("s1", "voter1", "up");
      }
      assert.equal(finds, 1, "قراءة واحدة فقط (cache)");
      assert.equal(updates, 0, "بلا كتابة قبل التفريغ");
      assert.equal(last.upCount, 0, "20 تبديلًا زوجيًا = إلغاء");
      await voteStore.flushVotes();
      assert.equal(updates, 1, "حفظ دفعي واحد");
      assert.deepEqual(stored.upvotes, []);
    } finally {
      shared.Suggestion.findOne = origFindOne;
      shared.Suggestion.findOneAndUpdate = origUpdate;
      voteStore.clearVoteState();
    }
  });
});

describe("Phase0: Central scheduler — مجدول واحد", () => {
  test("مهمة مستحقة تُنفَّذ، والتفريغ يعمل عند الإيقاف", async () => {
    let runs = 0;
    let flushed = false;
    scheduler.registerRecurring("t-phase0", 5000, async () => { runs++; });
    scheduler.registerFlushHandler("t-phase0-flush", async () => { flushed = true; });
    assert.ok(scheduler.schedulerTaskCount() >= 1);
    scheduler.startScheduler({});
    // أول استحقاق بعد ~5 ثوانٍ
    await new Promise((r) => setTimeout(r, 5600));
    assert.ok(runs >= 1, "يجب أن تعمل المهمة الدورية");
    await scheduler.stopScheduler();
    assert.ok(flushed, "يجب تفريغ المعلق عند الإيقاف");
    assert.equal(scheduler.isSchedulerRunning(), false);
  }, { timeout: 15000 });
});

describe("Phase0: Message context + metrics + event router", () => {
  test("السياق يشارك نفس كائن الإعدادات بالمرجع", () => {
    const gConfig = { prefix: "," };
    const message = { guild: { id: "g1" }, member: {}, author: { id: "u1" }, channel: {}, channelId: "c1" };
    const ctx = buildMessageContext({}, message, gConfig);
    assert.ok(ctx);
    assert.strictEqual(ctx.guildConfig, gConfig, "نفس المرجع — بلا نسخ ولا إعادة جلب");
    assert.equal(ctx.guildId, "g1");
    assert.equal(buildMessageContext({}, { ...message, guild: null }, gConfig), null);
  });

  test("العدّادات تعمل وتُصفَّر", () => {
    metrics.resetMetrics();
    metrics.recordMessageProcessed(10);
    metrics.recordCommandRun();
    metrics.recordDbRead(2);
    metrics.recordDbWrite();
    metrics.recordCacheHit();
    metrics.recordCacheMiss();
    const snap = metrics.getMetrics();
    assert.equal(snap.messagesProcessed, 1);
    assert.equal(snap.messageProcessingMsTotal, 10);
    assert.equal(snap.commandsRun, 1);
    assert.equal(snap.dbReads, 2);
    assert.equal(snap.dbWrites, 1);
    assert.equal(snap.cacheHits, 1);
    assert.equal(snap.cacheMisses, 1);
    metrics.resetMetrics();
    assert.equal(metrics.getMetrics().messagesProcessed, 0);
  });

  test("الموجّه: ترتيب + إيقاف + عزل أخطاء", async () => {
    eventRouter.clearEventRoutes();
    const order = [];
    eventRouter.onEvent("test-ev", "a", async () => { order.push("a"); });
    eventRouter.onEvent("test-ev", "b", async () => { order.push("b"); return true; });
    eventRouter.onEvent("test-ev", "c", async () => { order.push("c"); });
    const stopped = await eventRouter.dispatchEvent("test-ev");
    assert.equal(stopped, true);
    assert.deepEqual(order, ["a", "b"]);

    // عزل الأخطاء: معالج يرمي لا يوقف البقية
    eventRouter.clearEventRoutes();
    const order2 = [];
    eventRouter.onEvent("test-ev2", "x", async () => { throw new Error("boom"); });
    eventRouter.onEvent("test-ev2", "y", async () => { order2.push("y"); });
    await eventRouter.dispatchEvent("test-ev2");
    assert.deepEqual(order2, ["y"]);
    eventRouter.clearEventRoutes();
  });
});
