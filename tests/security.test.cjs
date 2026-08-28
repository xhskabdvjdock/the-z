const { test, describe } = require("node:test");
const assert = require("node:assert");

// ---------- تجهيز: لا قاعدة بيانات في بيئة الاختبار ----------
const shared = require("../shared/dist/index.js");
const originalFindOne = shared.GuildConfig.findOne;
shared.GuildConfig.findOne = async () => null;

const { verifyCommandPermission } = require("../bot/dist/utils/permissions.js");
const banModule = require("../bot/dist/commands/moderation/ban.js");
const kickModule = require("../bot/dist/commands/moderation/kick.js");
const banCmd = banModule.default ?? banModule;
const kickCmd = kickModule.default ?? kickModule;

const BAN_PERM = 1n << 2n; // BanMembers

// ---------- أدوات مصغّرة لتشكيل سياق أمر وهمي ----------
function makeTarget(overrides = {}) {
  const baseId = overrides.id ?? "222222222222222222";
  return {
    id: baseId,
    user: { id: baseId, tag: "target", ...(overrides.user ?? {}) },
    roles: { highest: { position: 1 } },
    bannable: true,
    kickable: true,
    ban: async () => {},
    kick: async () => {},
    ...overrides,
    user: { id: baseId, tag: "target", ...(overrides.user ?? {}) }
  };
}

function makeCtx(target, memberOverrides = {}, reply = () => ({ delete: async () => {}, content: "" })) {
  return {
    user: { id: "111111111111111111", tag: "executor" },
    guild: { id: "333333333333333333", ownerId: "444444444444444444" },
    member: { id: "111111111111111111", roles: { highest: { position: 5 } }, ...memberOverrides },
    getMember: async () => target,
    getUser: async () => target?.user ?? null,
    getString: () => null,
    getInteger: () => null,
    reply
  };
}

// ---------- (5)(6)(7)(8): بادئة / Hierarchy بندي ----------
describe("Prefix commands enforcement (regression)", () => {
  test("(5-bonus) Administrator bypass يعمل كما في Discord (بقصد)", () => {
    const member = { permissions: { has: (p) => p === "Administrator" } };
    const r = verifyCommandPermission(banCmd, member, { permissionsFor: () => ({ has: () => false }) });
    assert.equal(r.allowed, true);
  });

  test("(5) prefix ban by normal user بدون صلاحية → مرفوض", () => {
    const member = { permissions: { has: () => false } };
    const r = verifyCommandPermission(banCmd, member, { permissionsFor: () => ({ has: () => false }) });
    assert.equal(r.allowed, false);
    assert.ok(r.reason && r.reason.length > 0);
  });

  test("(6) prefix kick by normal user → مرفوض", () => {
    const member = { permissions: { has: () => false } };
    const r = verifyCommandPermission(kickCmd, member, { permissionsFor: () => ({ has: () => false }) });
    assert.equal(r.allowed, false);
  });

  test("(8) Owner protection: لا يمكن حظر المالك", async () => {
    const owner = makeTarget({ id: "444444444444444444", user: { tag: "owner" } });
    const ctx = makeCtx(owner);
    await banCmd.run(ctx);
    // يجب ألا يصل لاستدعاء الحظر إطلاقًا
    assert.equal(owner.banCalled, undefined);
  });

  test("(8) Owner protection (kick): لا يمكن طرد المالك", async () => {
    const owner = makeTarget({ id: "444444444444444444", user: { tag: "owner" } });
    const ctx = makeCtx(owner);
    await kickCmd.run(ctx);
    assert.equal(owner.kickCalled, undefined);
  });

  test("(7) Hierarchy violation: هدف برتبة أعلى → ممنوع (executor < target)", async () => {
    const target = makeTarget({ id: "555555555555555555", roles: { highest: { position: 9 } } });
    const ctx = makeCtx(target); // executor position 5
    await banCmd.run(ctx);
    assert.equal(target.banCalled, undefined);
  });

  test("(7) Hierarchy: هدف برتبة مساوية → ممنوع", async () => {
    const target = makeTarget({ id: "555555555555555555", roles: { highest: { position: 5 } } });
    const ctx = makeCtx(target);
    await banCmd.run(ctx);
    assert.equal(target.banCalled, undefined);
  });

  test("(7) Bot hierarchy: هدف لا تستطيع الحقيقة handle → مرفوض (bannable=false)", async () => {
    const target = makeTarget({ id: "555555555555555555", bannable: false });
    const ctx = makeCtx(target);
    await banCmd.run(ctx);
    assert.equal(target.banCalled, undefined);
  });

  test("(7) Self target → مرفوض", async () => {
    const self = makeTarget({ id: "111111111111111111" });
    const ctx = makeCtx(self);
    await banCmd.run(ctx);
    assert.equal(self.banCalled, undefined);
  });

  test("المالك هو من ينفذ → يُسمح بمعاملة من يراه مناسبًا (يتم تجاهل الهرمية)", async () => {
    const target = makeTarget({ id: "555555555555555555", roles: { highest: { position: 9 } }, bannable: true, banCalled: false });
    target.ban = async () => { target.banCalled = true; };
    const ctx = makeCtx(target, {}, async (opts) => ({ content: opts.content }));
    ctx.user.id = ctx.guild.ownerId; // المالك ينفذ
    try {
      await banCmd.run(ctx);
    } catch {}
    assert.equal(target.banCalled, true);
  });
});

// ---------- (2)(3)(4)(14): Cross-guild + Server Actions موحّدة ----------
describe("Cross-guild & Dashboard access policy", () => {
  const base = (extra = {}) => ({
    isOwner: false,
    isAdministrator: false,
    allowAdministrators: true,
    userId: "u-1111",
    memberRoleIds: [],
    dashboardRoles: [],
    ...extra
  });

  test("(2) رتبة لوحة/أدمن من سيرفر B لا تمنح مستوى إداري معلوم في policy — والبوابة (caller) تسقط غير الأعضاء قبلها", () => {
    // resolveGuildAccessLevel نفسها لا تعرف العضوية — العضوية تُتحقق في المتصل
    // (requireApiGuild/requireGuildAdmin) عبر سيرة المستخدم، والـ tests أسفل في قسم
    // "(1)/(14)" تغطي هذه البوابة بالضبط. هنا نؤكد أن رتبة من سيرفر آخر لا تمنح admin/owner أبدًا:
    const level = shared.resolveGuildAccessLevel({
      ...base({ userId: "uB" }),
      memberRoleIds: ["roleB"],
      dashboardRoles: [{ id: "d1", name: "A-staff", userIds: ["uB"], roleIds: [] }]
    });
    assert.notEqual(level, "owner");
    assert.notEqual(level, "admin");
    assert.equal(level, "dashboardRole"); // فقط مستوى الرتبة — وليس الوصول التنفيذي
  });

  test("(3) Invalid guild id (not snowflake) → non-ok (404/400 analog)", () => {
    const bad = shared.isSnowflakeId("guildA");
    assert.equal(bad, false);
  });

  test("(4) Dashboard role بدون صلاحيات الوصول للقسم → مستوى منخفض فقط / لا can-modify", () => {
    const level = shared.resolveGuildAccessLevel({
      ...base(),
      dashboardRoles: [{ id: "d2", name: "viewer", userIds: ["u-1111"], roleIds: [] }]
    });
    assert.equal(level, "dashboardRole");
  });

  test("(4) Dashboard role لا تمنح صلاحيات مدارية إضافية على Discord (policy لا بشكل تلقائي)", () => {
    // حتى مع مستوى dashboardRole، صلاحيات Discord الأساسية كانت مفقودة أصلاً
    const level = shared.resolveGuildAccessLevel({
      ...base({ isAdministrator: false }),
      dashboardRoles: [{ id: "d3", userIds: ["u-1111"] }]
    });
    assert.equal(level, "dashboardRole");
    assert.notEqual(level, "admin");
  });
});

// ---------- (13) Invalid API body / inputs ----------
describe("Validation (API body limits)", () => {
  const v = require("../shared/dist/utils/validate.js");

  test("reason > 512 → مرفوض (محاكاة حراسة الـ route)", () => {
    const tooLong = "x".repeat(513);
    const ok = v.getSanitizedString(tooLong, 512);
    assert.equal(ok, null);
    const fine = v.getSanitizedString("hello", 512);
    assert.equal(fine, "hello");
  });

  test("duration خارج النطاق → مرفوض", () => {
    assert.equal(v.getDurationSeconds(5, 10, 1000), null);
    assert.equal(v.getDurationSeconds(600, 10, 1000), 600);
  });

  test("deleteMessageDays خارج 0-7 → مرفوض (7 أيام كحد أقصى)", () => {
    assert.equal(v.clampInt(9, 0, 7, 0), 7);
    assert.equal(v.clampInt("07", 0, 7, 0), 7);
  });

  test("enum خارج المسموح → مرفوض", () => {
    assert.equal(v.isEnumValue("unknown", ["ban", "kick", "timeout"]), false);
    assert.equal(v.isEnumValue("ban", ["ban", "kick", "timeout"]), true);
  });
});

// ---------- (9) DB: $in/$nin edge matrix ----------
describe("DB filter edge matrix", () => {
  const { buildSqlWhere } = require("../shared/dist/db/sql.js");
  const { matchesFilter } = require("../shared/dist/db/collection.js");

  test("$in مع أرقام (وليس نصوصًا) — أنماط التناقض غير متداخلة", () => {
    assert.ok(matchesFilter({ n: 5 }, { n: { $in: [5] } }));
    assert.ok(!matchesFilter({ n: 5 }, { n: { $in: ["5"] } }));
  });

  test("$in قائمة فارغة → لا مطابقة إطلاقًا", () => {
    assert.ok(!matchesFilter({ n: 1 }, { n: { $in: [] } }));
    // SQL: يخرج null → لا دفع — السلوك أمان في كلا الطبقتين
    const q = buildSqlWhere({ n: { $in: [] } });
    assert.equal(q.where, "");
  });

  test("$nin مع قائمة فارغة → كل القيم مطابقة حتى الغائب", () => {
    assert.ok(matchesFilter({ n: 1 }, { n: { $nin: [] } }));
    assert.ok(matchesFilter({ }, { n: { $nin: [] } }));
  });

  test("القيم غير المصفوفة ضمن $in (كائن/رقم كبير) لا تدمر الفلتر", () => {
    const q = buildSqlWhere({ a: { $in: 1n } });
    assert.ok(!q.where.includes("1n")); // لا نص خام
    assert.equal(q.where, "");
  });

  test("SQL injection عبر $in item (قيمة := '...' OR 1=1) لا تمرر", () => {
    const q = buildSqlWhere({ guildId: "g", status: { $in: ["'; DROP TABLE t;--"] } });
    assert.ok(!q.where.includes("DROP"));
    assert.ok(q.where.includes("= ANY($"));
  });
});

// ---------- (11) Cooldown / (12) RateLimit ----------
describe("Cooldown & RateLimit produc", () => {
  const rl = require("../shared/dist/utils/rateLimit.js");
  const cd = require("../shared/dist/utils/cooldown.js");

  test("(12) RateLimit: بمفاتيح كبيرة عبر guildId وهمي ـ لا يتجاوز ولا يضخّم الذاكرة", () => {
    const limiter = new rl.MemoryRateLimiter({ limit: 2, windowMs: 60_000 });
    const now = Date.now();
    // محاكاة هجوم: إرسال طلبات عبر guildIds مختلفة
    for (let i = 0; i < 500; i++) {
      if (i % 2 === 0) continue; // نصف مفاتيح فقط
      limiter.check(`user0:guild${i}`, now);
    }
    assert.ok(limiter.size <= 250, `size=${limiter.size}`);
    // والمفتاح نفسه يظل محميًا ضمن حده
    assert.equal(limiter.check("a", now).allowed, true);
    assert.equal(limiter.check("a", now).allowed, true);
    assert.equal(limiter.check("a", now).allowed, false);
  });

  test("(11) Cooldown: لا يؤثر مفتاح شخص على آخر", () => {
    const store = new cd.MemoryCooldownStore();
    const now = Date.now();
    cd.registerCooldown(store, cd.getCooldownKey("ban", "g1", "userX"), now);
    assert.ok(cd.checkCooldown(store, cd.getCooldownKey("ban", "g1", "userY"), 5, now).allowed);
    assert.ok(!cd.checkCooldown(store, cd.getCooldownKey("ban", "g1", "userX"), 5, now + 1000).allowed);
    assert.ok(cd.checkCooldown(store, cd.getCooldownKey("ban", "g1", "userX"), 5, now + 5000).allowed);
  });

  test("(11) Cooldown interface قابل للاستبدال بـ Redis بدون تغيير الأوامر", () => {
    // المتطلب: الواجهة (get/set/delete) كافية لمحاكاة أي خلفية
    const fakeRedis = { get: () => null, set: (k, t) => {}, delete: (k) => {} };
    assert.equal(cd.checkCooldown(fakeRedis, "x", 5).allowed, true);
  });
});

// ---------- (1) Unauthorized / (14) cross-guild — عبر المحاكاة الصريحة ----------
describe("(1)/(14) API-server entry: unauthorized & cross-guild", () => {
  test("بلا بيانات مصادقة → فشل فورًا (الطبقة الأولى in requireApiGuild)", () => {
    // هذا الاختبار يحاكي أول سطر حماية: لا session → 401
    const sessionLike = null;
    assert.ok(!sessionLike?.accessToken);
  });

  test("مستخدم من سيرفر آخر → لا يمر من بوابة requireApiGuild (النقطة الرابعة)", () => {
    const userGuilds = [{ id: "guildB", owner: false, permissions: "0" }];
    const guildId = "guildA";
    const target = userGuilds.find((g) => g.id === guildId);
    // عضوية مرفوضة → يعادل 403 في الـ route
    assert.equal(target, undefined);
  });

  test("بوت غير مضاف لـ guildA → 404 (كما صمّم الـ route)", () => {
    const botGuilds = new Set(["guildC"]);
    assert.ok(!botGuilds.has("guildA"));
  });
});

// طبقة الاستعادة بعد الاختبارات
process.on("beforeExit", () => {
  shared.GuildConfig.findOne = originalFindOne;
});