const { test, describe } = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");

const shared = require("../shared/dist/index.js");
const analytics = require("../bot/dist/modules/analytics/analytics.js");
const starboard = require("../bot/dist/modules/starboard/starboardManager.js");
const metrics = require("../bot/dist/utils/metrics.js");

// ---------- أدوات وهمية ----------
function makeGuildConfig(overrides = {}) {
  return { prefix: "!", commandOverrides: [], ...overrides };
}

function makeFakeClient(guilds = new Map()) {
  return {
    guilds: { cache: guilds },
    channels: { cache: new Map() },
    guildConfigCache: new Map(),
    ws: { ping: 42 },
    user: { id: "bot1" }
  };
}

function seedConfig(client, guildId, config) {
  client.guildConfigCache.set(guildId, { data: config, expiresAt: Date.now() + 60000 });
}

function makeGuild(id) {
  const guild = {
    id,
    name: "g",
    memberCount: 10,
    channels: { cache: new Map() },
    members: { cache: new Map(), fetch: async (uid) => guild.members.cache.get(uid) ?? null }
  };
  return guild;
}

function makeTextChannel(id, name = "general") {
  const sent = [];
  const messagesCache = new Map();
  return {
    id,
    name,
    sent,
    isTextBased: () => true,
    messages: { cache: messagesCache, fetch: async (mid) => messagesCache.get(mid) ?? null },
    send: async function (payload) {
      const msg = { id: `sb-${Math.random().toString(36).slice(2, 8)}`, ...payload };
      this.sent.push(msg);
      return msg;
    }
  };
}

function makeMessage({ id = "m1", guild, channelId = "c1", authorId = "u1", bot = false, content = "hello world", partial = false, attachments = [], ageDays = 400 }) {
  const author = {
    id: authorId,
    bot,
    tag: `${authorId}#1`,
    createdTimestamp: Date.now() - ageDays * 24 * 60 * 60_000,
    displayAvatarURL: () => ""
  };
  const message = {
    id,
    guild,
    guildId: guild.id,
    channelId,
    channel: { id: channelId, name: "general" },
    author,
    content,
    partial,
    attachments,
    createdAt: new Date(),
    url: `https://discord.com/channels/${guild.id}/${channelId}/${id}`,
    fetch: async () => message
  };
  return message;
}

function makeReaction({ message, emoji = "⭐", count = 1 }) {
  return { emoji: { name: emoji }, count, message };
}

function makeUser(id, bot = false) {
  return { id, bot };
}

describe("Phase1: Analytics — بلا كتابة لكل رسالة", () => {
  test("1000 رسالة → ≤4 عمليات DB للتفريغ، ودمج صحيح", async () => {
    analytics.clearAnalyticsState();
    const ops = [];
    const origFindOne = shared.AnalyticsBucket.findOne;
    const origFindOneAndUpdate = shared.AnalyticsBucket.findOneAndUpdate;
    const origDeleteOne = shared.AnalyticsBucket.deleteOne;
    shared.AnalyticsBucket.findOne = async () => { ops.push("findOne"); return null; };
    shared.AnalyticsBucket.findOneAndUpdate = async () => { ops.push("findOneAndUpdate"); return null; };
    shared.AnalyticsBucket.deleteOne = async () => { ops.push("deleteOne"); };
    try {
      for (let i = 0; i < 1000; i++) {
        analytics.trackMessage("g1", `user${i % 50}`, `ch${i % 3}`);
      }
      assert.equal(ops.length, 0, "صفر عمليات قبل التفريغ");
      await analytics.flushAnalytics();
      // أول تفريغ يتضمن تنظيف Retention لمرة واحدة (24 ساعة + 7 أيام)
      assert.ok(ops.length <= 40, `التنظيف الأول محدود، كان ${ops.length}`);
      ops.length = 0;
      for (let i = 0; i < 100; i++) {
        analytics.trackMessage("g1", `user${i % 10}`, "ch1");
      }
      await analytics.flushAnalytics();
      // الحالة المستقرة: ساعة (قراءة+كتابة) + يوم (كتابة) = 3 عمليات
      assert.ok(ops.length <= 4, `عمليات محدودة، كانت ${ops.length}`);
      assert.ok(ops.filter((o) => o === "findOneAndUpdate").length >= 2);
    } finally {
      shared.AnalyticsBucket.findOne = origFindOne;
      shared.AnalyticsBucket.findOneAndUpdate = origFindOneAndUpdate;
      shared.AnalyticsBucket.deleteOne = origDeleteOne;
      analytics.clearAnalyticsState();
    }
  });

  test("منع التكرار: نفس المستخدم 100 مرة → إدخال واحد بعدد 100", async () => {
    analytics.clearAnalyticsState();
    let saved = null;
    const origFindOne = shared.AnalyticsBucket.findOne;
    const origFindOneAndUpdate = shared.AnalyticsBucket.findOneAndUpdate;
    shared.AnalyticsBucket.findOne = async () => null;
    shared.AnalyticsBucket.findOneAndUpdate = async (filter, update) => { saved = { filter, update }; return null; };
    try {
      for (let i = 0; i < 100; i++) analytics.trackMessage("g1", "same-user", "ch1");
      await analytics.flushAnalytics();
      assert.ok(saved, "تم الحفظ");
      assert.equal(saved.update.$inc["metrics.messages"], 100);
    } finally {
      shared.AnalyticsBucket.findOne = origFindOne;
      shared.AnalyticsBucket.findOneAndUpdate = origFindOneAndUpdate;
      analytics.clearAnalyticsState();
    }
  });

  test("دمج مع حاوية موجودة + قص tops + حدود المفاتيح", async () => {
    analytics.clearAnalyticsState();
    const updates = [];
    const origFindOne = shared.AnalyticsBucket.findOne;
    const origFindOneAndUpdate = shared.AnalyticsBucket.findOneAndUpdate;
    shared.AnalyticsBucket.findOne = async (filter) => {
      if (String(filter.key).includes(":hour:")) return { metrics: { messages: 5 }, topUsers: [], topChannels: [] };
      return null;
    };
    shared.AnalyticsBucket.findOneAndUpdate = async (filter, update) => { updates.push({ filter, update }); return null; };
    try {
      for (let u = 0; u < 30; u++) analytics.trackMessage("g1", `user${u}`, "ch1");
      for (let c = 0; c < 150; c++) analytics.trackCommand("g1", `cmd${c}`);
      for (let m = 0; m < 30; m++) analytics.trackModeration("g1", `action${m}`);
      await analytics.flushAnalytics();
      const hourUpdate = updates.find((u) => String(u.filter.key).includes(":hour:"));
      assert.ok(hourUpdate, "حاوية الساعة كُتبت");
      assert.equal(hourUpdate.update.$set.metrics.messages, 35, "5 موجودة + 30 جديدة");
      assert.ok(hourUpdate.update.$set.topUsers.length <= 25);
      const dayUpdate = updates.find((u) => String(u.filter.key).includes(":day:"));
      assert.ok(dayUpdate, "حاوية اليوم كُتبت");
      const cmdKeys = Object.keys(dayUpdate.update.$inc).filter((k) => k.startsWith("metrics.command_"));
      assert.ok(cmdKeys.length <= 100, `الأوامر مقتطعة: ${cmdKeys.length}`);
      const modKeys = Object.keys(dayUpdate.update.$inc).filter((k) => k.startsWith("metrics.moderation_"));
      assert.ok(modKeys.length <= 20, `الإجراءات مقتطعة: ${modKeys.length}`);
    } finally {
      shared.AnalyticsBucket.findOne = origFindOne;
      shared.AnalyticsBucket.findOneAndUpdate = origFindOneAndUpdate;
      analytics.clearAnalyticsState();
    }
  });

  test("الصوت: انضمام/مغادرة يحسب الدقائق بدون DB فورية", async () => {
    analytics.clearAnalyticsState();
    let saved = null;
    const origFindOne = shared.AnalyticsBucket.findOne;
    const origFindOneAndUpdate = shared.AnalyticsBucket.findOneAndUpdate;
    shared.AnalyticsBucket.findOne = async () => null;
    shared.AnalyticsBucket.findOneAndUpdate = async (filter, update) => { saved = update; return null; };
    try {
      analytics.trackVoiceJoin("g1", "u1");
      await analytics.flushAnalytics();
      assert.ok(saved.$inc["metrics.voiceSessions"] >= 1);
    } finally {
      shared.AnalyticsBucket.findOne = origFindOne;
      shared.AnalyticsBucket.findOneAndUpdate = origFindOneAndUpdate;
      analytics.clearAnalyticsState();
    }
  });

  test("Retention: حذف مفاتيح منتهية محسوبة فقط (24 ساعة + 7 أيام)", async () => {
    const deleted = [];
    const origDeleteOne = shared.AnalyticsBucket.deleteOne;
    shared.AnalyticsBucket.deleteOne = async (filter) => { deleted.push(filter.key); };
    try {
      await analytics.cleanupGuildForTests("g9", new Date("2026-09-16T12:00:00Z"));
      assert.equal(deleted.filter((k) => k.includes(":hour:")).length, 24);
      assert.equal(deleted.filter((k) => k.includes(":day:")).length, 7);
      assert.ok(deleted.every((k) => k.startsWith("g9:")));
      assert.ok(deleted.some((k) => k === "g9:hour:2026-09-08T00"));
    } finally {
      shared.AnalyticsBucket.deleteOne = origDeleteOne;
    }
  });
});

describe("Phase1: Health — فحوص خفيفة", () => {
  // محمّل صغير لملفات dashboard/src/lib مع حل الاستيرادات النسبية بينها
  const libCache = {};
  function loadDashboardLib(name) {
    if (libCache[name]) return libCache[name].exports;
    let ts;
    try {
      ts = require("typescript");
    } catch {
      ts = require("../dashboard/node_modules/typescript");
    }
    const src = fs.readFileSync(
      path.join(__dirname, "..", "dashboard", "src", "lib", name + ".ts"),
      "utf8"
    );
    const out = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } });
    const mod = { exports: {} };
    const localRequire = (req) => {
      if (req.startsWith("./")) return loadDashboardLib(req.slice(2));
      return require(req);
    };
    new Function("exports", "module", "require", out.outputText)(mod.exports, mod, localRequire);
    libCache[name] = mod;
    return mod.exports;
  }
  async function loadHealth() {
    return loadDashboardLib("health");
  }

  test("DB معطلة → خطأ واضح، وRedis المعطل غير قاتل", async () => {
    const health = await loadHealth();
    const data = await health.getHealthData("g1", {
      getHeartbeat: async () => null,
      pingDb: async () => ({ ok: false, ms: 5 }),
      pingRedis: async () => ({ ok: false, ms: 1, connected: false }),
      getConfig: async () => ({}),
      getChannels: async () => [],
      getRoles: async () => []
    });
    assert.equal(data.database.ok, false);
    assert.ok(data.issues.some((i) => i.area === "bot" && i.severity === "error"));
    assert.ok(data.issues.some((i) => i.area === "database"));
    assert.equal(data.bot.online, false);
  });

  test("نبضة قديمة → البوت غير متصل + تحذير فشل المجدول", async () => {
    const health = await loadHealth();
    const data = await health.getHealthData("g1", {
      getHeartbeat: async () => ({
        id: "bot",
        updatedAt: new Date(Date.now() - 600_000),
        uptimeSec: 100,
        wsPingMs: 50,
        guilds: 3,
        scheduler: { tasks: 5, run: 10, failed: 2 },
        metrics: {},
        cache: { guildConfigSize: 3, hits: 10, misses: 1 },
        redis: { connected: false }
      }),
      pingDb: async () => ({ ok: true, ms: 3 }),
      pingRedis: async () => ({ ok: false, ms: 1, connected: false }),
      getConfig: async () => ({}),
      getChannels: async () => [],
      getRoles: async () => []
    });
    assert.equal(data.bot.online, false);
    assert.ok(data.issues.some((i) => i.message.includes("قديمة")));
    assert.ok(data.issues.some((i) => i.area === "scheduler"));
  });

  test("قناة مفقودة في الإعدادات → تحذير، والسليمة بلا مشاكل", async () => {
    const health = await loadHealth();
    const deps = {
      getHeartbeat: async () => ({
        id: "bot",
        updatedAt: new Date(),
        uptimeSec: 100,
        wsPingMs: 50,
        guilds: 1,
        scheduler: { tasks: 5, run: 10, failed: 0 },
        metrics: {},
        cache: { guildConfigSize: 1, hits: 10, misses: 1 },
        redis: { connected: true }
      }),
      pingDb: async () => ({ ok: true, ms: 2 }),
      pingRedis: async () => ({ ok: true, ms: 1, connected: true }),
      getConfig: async () => ({ starboard: { channelId: "999999999999999999" } }),
      getChannels: async () => [{ id: "111111111111111111", name: "general" }],
      getRoles: async () => []
    };
    const bad = await health.getHealthData("g1", deps);
    assert.ok(bad.issues.some((i) => i.area === "config" && i.message.includes("999999999999999999")));
    const good = await health.getHealthData("g2", {
      ...deps,
      getConfig: async () => ({ starboard: { channelId: "111111111111111111" } })
    });
    assert.equal(good.issues.length, 0);
  });

  test("10 تحديثات → جلب واحد (كاش 10 ثوانٍ)", async () => {
    const health = await loadHealth();
    let calls = 0;
    const deps = {
      getHeartbeat: async () => { calls++; return null; },
      pingDb: async () => ({ ok: true, ms: 1 }),
      pingRedis: async () => ({ ok: true, ms: 1, connected: false }),
      getConfig: async () => ({}),
      getChannels: async () => [],
      getRoles: async () => []
    };
    for (let i = 0; i < 10; i++) await health.getCachedHealthData("g-cache", deps);
    assert.equal(calls, 1);
  });

  test("رتبة مفقودة في الإعدادات → تحذير", async () => {
    const health = await loadHealth();
    const deps = {
      getHeartbeat: async () => ({
        id: "bot",
        updatedAt: new Date(),
        uptimeSec: 100,
        wsPingMs: 50,
        guilds: 1,
        scheduler: { tasks: 5, run: 10, failed: 0 },
        metrics: {},
        cache: { guildConfigSize: 1, hits: 10, misses: 1 },
        redis: { connected: true }
      }),
      pingDb: async () => ({ ok: true, ms: 2 }),
      pingRedis: async () => ({ ok: true, ms: 1, connected: true }),
      getConfig: async () => ({ jail: { roleId: "222222222222222222" } }),
      getChannels: async () => [],
      getRoles: async () => [{ id: "111111111111111111", name: "admin" }]
    };
    const data = await health.getHealthData("g1", deps);
    assert.ok(data.issues.some((i) => i.area === "config" && i.message.includes("222222222222222222")));
  });
});

describe("Phase1: Dashboard apiCache — كاش TTL محدود", () => {
  async function loadApiCache() {
    let ts;
    try {
      ts = require("typescript");
    } catch {
      ts = require("../dashboard/node_modules/typescript");
    }
    const src = fs.readFileSync(
      path.join(__dirname, "..", "dashboard", "src", "lib", "apiCache.ts"),
      "utf8"
    );
    const out = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } });
    const mod = { exports: {} };
    const localRequire = (req) => {
      if (req.startsWith("./")) throw new Error("unexpected relative import: " + req);
      return require(req);
    };
    new Function("exports", "module", "require", out.outputText)(mod.exports, mod, localRequire);
    return mod.exports;
  }

  test("10 طلبات متطابقة → تجميع واحد فقط", async () => {
    const { createTtlCache } = await loadApiCache();
    let aggregations = 0;
    const cache = createTtlCache(200, 30_000);
    async function expensiveAggregation() {
      aggregations++;
      return { total: 42 };
    }
    for (let i = 0; i < 10; i++) {
      let data = cache.get("g1:7d");
      if (!data) {
        data = await expensiveAggregation();
        cache.set("g1:7d", data);
      }
    }
    assert.equal(aggregations, 1);
  });

  test("انتهاء TTL والحد الأعلى يعملان", async () => {
    const { createTtlCache } = await loadApiCache();
    const cache = createTtlCache(2, 30);
    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("c", 3); // يطرد الأقدم
    assert.equal(cache.size, 2);
    assert.equal(cache.get("a"), null);
    assert.equal(cache.get("b"), 2);
    await new Promise((r) => setTimeout(r, 50));
    assert.equal(cache.get("b"), null, "انتهت الصلاحية");
  });
});

describe("Phase1: Starboard — عتبة وتفاعلات", () => {
  function starboardConfig(overrides = {}) {
    return makeGuildConfig({
      starboard: {
        enabled: true,
        channelId: "sb1",
        threshold: 3,
        emoji: "⭐",
        ignoredChannelIds: [],
        ignoredRoleIds: [],
        ignoredUserIds: [],
        removeOnBelowThreshold: true,
        minAccountAgeDays: 0,
        ...overrides
      }
    });
  }

  function setupEnv(cfgOverrides = {}) {
    const guild = makeGuild("g1");
    const sbChannel = makeTextChannel("sb1", "starboard");
    guild.channels.cache.set("sb1", sbChannel);
    const client = makeFakeClient(new Map([["g1", guild]]));
    const cfg = starboardConfig(cfgOverrides);
    seedConfig(client, "g1", cfg);
    return { guild, sbChannel, client, cfg };
  }

  function stubStarboardDb(counters) {
    const orig = {
      findOne: shared.StarboardEntry.findOne,
      findOneAndUpdate: shared.StarboardEntry.findOneAndUpdate,
      deleteOne: shared.StarboardEntry.deleteOne
    };
    shared.StarboardEntry.findOne = async () => { counters.reads++; return null; };
    shared.StarboardEntry.findOneAndUpdate = async () => { counters.writes++; return null; };
    shared.StarboardEntry.deleteOne = async () => { counters.deletes++; };
    return () => {
      shared.StarboardEntry.findOne = orig.findOne;
      shared.StarboardEntry.findOneAndUpdate = orig.findOneAndUpdate;
      shared.StarboardEntry.deleteOne = orig.deleteOne;
    };
  }

  test("تحت الحد → لا نشر ولا كتابة؛ عند الحد → نشر مرة واحدة", async () => {
    starboard.clearStarboardState();
    const { guild, sbChannel, client } = setupEnv();
    const db = { reads: 0, writes: 0, deletes: 0 };
    const restore = stubStarboardDb(db);
    try {
      const message = makeMessage({ guild, authorId: "author1" });
      await starboard.handleStarboardAdd(client, makeReaction({ message, count: 2 }), makeUser("voter1"));
      assert.equal(sbChannel.sent.length, 0, "بلا نشر تحت الحد");
      assert.equal(db.writes, 0, "بلا كتابة تحت الحد");
      await starboard.handleStarboardAdd(client, makeReaction({ message, count: 3 }), makeUser("voter2"));
      assert.equal(sbChannel.sent.length, 1, "نشر واحد عند الحد");
      assert.equal(db.writes, 1, "كتابة واحدة عند النشر");
    } finally {
      restore();
      starboard.clearStarboardState();
    }
  });

  test("تكرار نفس العد → لا API إضافي", async () => {
    starboard.clearStarboardState();
    const { guild, sbChannel, client } = setupEnv();
    const db = { reads: 0, writes: 0, deletes: 0 };
    const restore = stubStarboardDb(db);
    try {
      const message = makeMessage({ guild, authorId: "author1" });
      await starboard.handleStarboardAdd(client, makeReaction({ message, count: 3 }), makeUser("v1"));
      const sentAfterPost = sbChannel.sent.length;
      await starboard.handleStarboardAdd(client, makeReaction({ message, count: 3 }), makeUser("v2"));
      await starboard.handleStarboardAdd(client, makeReaction({ message, count: 3 }), makeUser("v3"));
      assert.equal(sbChannel.sent.length, sentAfterPost, "لا رسائل جديدة");
    } finally {
      restore();
      starboard.clearStarboardState();
    }
  });

  test("100 تفاعل متتابع → تحديث API واحد (debounce)", async () => {
    starboard.clearStarboardState();
    const { guild, sbChannel, client } = setupEnv();
    const db = { reads: 0, writes: 0, deletes: 0 };
    const restore = stubStarboardDb(db);
    let edits = 0;
    try {
      const message = makeMessage({ guild, authorId: "author1" });
      await starboard.handleStarboardAdd(client, makeReaction({ message, count: 3 }), makeUser("v1"));
      // ربط رسالة اللوحة بالقناة حتى يجدها التحديث
      const posted = sbChannel.sent[0];
      sbChannel.messages.cache.set(posted.id, {
        ...posted,
        embeds: [{ title: "⭐ 3" }],
        edit: async () => { edits++; }
      });
      for (let i = 0; i < 100; i++) {
        await starboard.handleStarboardAdd(
          client,
          makeReaction({ message, count: 4 + (i % 5) }),
          makeUser(`voter${i}`)
        );
      }
      await new Promise((r) => setTimeout(r, 2500));
      assert.ok(edits <= 2, `تحديثات مدمجة، كانت ${edits}`);
    } finally {
      restore();
      starboard.clearStarboardState();
    }
  }, { timeout: 15000 });

  test("بوت/إيموجي خطأ/قناة مستثناة/مستخدم مستثنى/عمر حساب → تجاهل", async () => {
    starboard.clearStarboardState();
    const { guild, sbChannel, client } = setupEnv({
      ignoredChannelIds: ["c-ignored"],
      ignoredUserIds: ["bad-user"],
      minAccountAgeDays: 30
    });
    const db = { reads: 0, writes: 0, deletes: 0 };
    const restore = stubStarboardDb(db);
    try {
      const base = makeMessage({ guild, authorId: "author1" });
      await starboard.handleStarboardAdd(client, makeReaction({ message: base, count: 9 }), makeUser("bot1", true));
      await starboard.handleStarboardAdd(client, makeReaction({ message: base, count: 9, emoji: "🔥" }), makeUser("v1"));
      const ignoredChanMsg = makeMessage({ guild, authorId: "author1", channelId: "c-ignored" });
      await starboard.handleStarboardAdd(client, makeReaction({ message: ignoredChanMsg, count: 9 }), makeUser("v1"));
      const badUserMsg = makeMessage({ guild, authorId: "bad-user" });
      await starboard.handleStarboardAdd(client, makeReaction({ message: badUserMsg, count: 9 }), makeUser("v1"));
      const newAccountMsg = makeMessage({ guild, authorId: "newbie", ageDays: 2 });
      await starboard.handleStarboardAdd(client, makeReaction({ message: newAccountMsg, count: 9 }), makeUser("v1"));
      assert.equal(sbChannel.sent.length, 0);
      assert.equal(db.writes, 0);
    } finally {
      restore();
      starboard.clearStarboardState();
    }
  });

  test("النزول تحت الحد → حذف من اللوحة والسجل", async () => {
    starboard.clearStarboardState();
    const { guild, sbChannel, client } = setupEnv();
    const db = { reads: 0, writes: 0, deletes: 0 };
    const restore = stubStarboardDb(db);
    let deleted = 0;
    try {
      const message = makeMessage({ guild, authorId: "author1" });
      await starboard.handleStarboardAdd(client, makeReaction({ message, count: 3 }), makeUser("v1"));
      assert.equal(sbChannel.sent.length, 1);
      const posted = sbChannel.sent[0];
      sbChannel.messages.cache.set(posted.id, { ...posted, delete: async () => { deleted++; } });
      await starboard.handleStarboardRemove(client, makeReaction({ message, count: 2 }), makeUser("v1"));
      await new Promise((r) => setTimeout(r, 100));
      assert.equal(deleted, 1, "حُذفت رسالة اللوحة");
      assert.equal(db.deletes, 1, "حُذف السجل");
    } finally {
      restore();
      starboard.clearStarboardState();
    }
  });

  test("رسالة جزئية (partial) → جلب مرة واحدة عند الحاجة فقط", async () => {
    starboard.clearStarboardState();
    const { guild, sbChannel, client } = setupEnv();
    const db = { reads: 0, writes: 0, deletes: 0 };
    const restore = stubStarboardDb(db);
    let fetches = 0;
    try {
      const full = makeMessage({ guild, authorId: "author1" });
      const partialLike = { ...full, partial: true, fetch: async () => { fetches++; return full; } };
      // تحت الحد: لا جلب إطلاقًا
      await starboard.handleStarboardAdd(client, makeReaction({ message: partialLike, count: 1 }), makeUser("v1"));
      assert.equal(fetches, 0);
      // عند الحد: جلب واحد
      await starboard.handleStarboardAdd(client, makeReaction({ message: partialLike, count: 3 }), makeUser("v2"));
      assert.equal(fetches, 1);
      assert.equal(sbChannel.sent.length, 1);
    } finally {
      restore();
      starboard.clearStarboardState();
    }
  });

  test("100 تفاعل تحت الحد → صفر كتابات وصفر API", async () => {
    starboard.clearStarboardState();
    const { sbChannel, client } = setupEnv();
    const db = { reads: 0, writes: 0, deletes: 0 };
    const restore = stubStarboardDb(db);
    try {
      const guild = client.guilds.cache.get("g1");
      for (let i = 0; i < 100; i++) {
        const message = makeMessage({ guild, id: `m${i}`, authorId: `author${i}` });
        await starboard.handleStarboardAdd(client, makeReaction({ message, count: 1 }), makeUser(`v${i}`));
      }
      assert.equal(db.writes, 0);
      assert.equal(sbChannel.sent.length, 0);
    } finally {
      restore();
      starboard.clearStarboardState();
    }
  });
});
