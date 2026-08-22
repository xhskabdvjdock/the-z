const { test } = require("node:test");
const assert = require("node:assert");
const {
  MemoryCooldownStore,
  checkCooldown,
  registerCooldown,
  getCooldownKey,
} = require("../shared/dist/utils/cooldown.js");
const res = require("../shared/dist/utils/validate.js");
const {
  resolveGuildAccessLevel,
} = require("../shared/dist/utils/dashboard.js");

test("cooldown: new key is always allowed", () => {
  const store = new MemoryCooldownStore();
  assert.deepEqual(checkCooldown(store, "g:u:cmd", 0), { allowed: true, remainingSeconds: 0 });
  assert.deepEqual(checkCooldown(store, "g:u:cmd", 30), { allowed: true, remainingSeconds: 0 });
});

test("cooldown: register then immediate check blocks with remaining seconds", () => {
  const store = new MemoryCooldownStore();
  const now = Date.now();
  registerCooldown(store, "g:u:cmd", now);
  const r = checkCooldown(store, "g:u:cmd", 10, now + 1000);
  assert.equal(r.allowed, false);
  assert.ok(r.remainingSeconds > 0 && r.remainingSeconds <= 10);
});

test("cooldown: block disappears after window", () => {
  const store = new MemoryCooldownStore();
  const now = 1e12;
  registerCooldown(store, "g:u:cmd", now);

  // -1 ثانية من نهاية النافذة → ممنوع
  assert.equal(checkCooldown(store, "g:u:cmd", 5, now + 4999).allowed, false);
  // لحظة انتهاء النافذة → مسموح
  assert.equal(checkCooldown(store, "g:u:cmd", 5, now + 5000).allowed, true);
});

test("cooldown: invalid or negative seconds always allowed", () => {
  const store = new MemoryCooldownStore();
  registerCooldown(store, "k", Date.now());
  assert.ok(checkCooldown(store, "k", -1).allowed);
  assert.ok(checkCooldown(store, "k", NaN).allowed);
});

test("cooldown: getCooldownKey separates keys by prefix", () => {
  assert.ok(getCooldownKey("g", "u", "ban") !== getCooldownKey("g2", "u", "ban"));
  assert.ok(getCooldownKey("g", "u", "ban") !== getCooldownKey("g", "u", "kick"));
});

test("validate/isSnowflakeId: boundaries", () => {
  assert.ok(res.isSnowflakeId("12345678901234567"));
  assert.ok(res.isSnowflakeId("123456789012345678"));
  assert.ok(res.isSnowflakeId("12345678901234567890"));
  assert.ok(!res.isSnowflakeId("1234567890123456")); // 16
  assert.ok(!res.isSnowflakeId("123456789012345678901")); // 21
  assert.ok(!res.isSnowflakeId("abc123456789012345"));
  assert.ok(!res.isSnowflakeId(null));
});

test("validate/getStringArray: limits duplicates and types", () => {
  const list = res.getStringArray(["a", "b", "a", "bbb"], 8, 10);
  assert.deepEqual(list, ["a", "b", "bbb"]);
  assert.equal(res.getStringArray(["a", 123], 8, 10), null);
  assert.equal(res.getStringArray(["aaaaaaaaaaaaaaaaa"], 8, 10), null);
  assert.deepEqual(res.getStringArray([], 8, 10), []);
  assert.equal(res.getStringArray(null, 8, 10), null);
});

test("resolveGuildAccessLevel: owner wins", () => {
  const base = {
    isAdministrator: false,
    allowAdministrators: false,
    userId: "u1",
    memberRoleIds: [],
    dashboardRoles: [],
  };
  assert.equal(resolveGuildAccessLevel({ ...base, isOwner: true }), "owner");
});

test("resolveGuildAccessLevel: owner still owner even if no admin", () => {
  const level = resolveGuildAccessLevel({
    isOwner: true,
    isAdministrator: false,
    allowAdministrators: false,
    userId: "u1",
    memberRoleIds: [],
    dashboardRoles: [],
  });
  assert.equal(level, "owner");
});

test("resolveGuildAccessLevel: admin allowed when allowAdministrators", () => {
  const level = resolveGuildAccessLevel({
    isOwner: false,
    isAdministrator: true,
    allowAdministrators: true,
    userId: "u1",
    memberRoleIds: [],
    dashboardRoles: [],
  });
  assert.equal(level, "admin");
});

test("resolveGuildAccessLevel: admin blocked when disabled and no role", () => {
  const level = resolveGuildAccessLevel({
    isOwner: false,
    isAdministrator: true,
    allowAdministrators: false,
    userId: "u1",
    memberRoleIds: [],
    dashboardRoles: [],
  });
  assert.equal(level, "none");
});

test("resolveGuildAccessLevel: dashboard role via userIds", () => {
  const level = resolveGuildAccessLevel({
    isOwner: false,
    isAdministrator: false,
    allowAdministrators: false,
    userId: "u-target",
    memberRoleIds: [],
    dashboardRoles: [
      { id: "d1", name: "Support", userIds: ["u-target"], roleIds: [] },
    ],
  });
  assert.equal(level, "dashboardRole");
});

test("resolveGuildAccessLevel: dashboard role via member roles", () => {
  const level = resolveGuildAccessLevel({
    isOwner: false,
    isAdministrator: false,
    allowAdministrators: true,
    userId: "u1",
    memberRoleIds: ["r10"],
    dashboardRoles: [{ id: "d2", name: "Mods", userIds: [], roleIds: ["r10"] }],
  });
  assert.equal(level, "dashboardRole");
});

test("resolveGuildAccessLevel: outsiders with dashboard role get none (membership enforced by caller)", () => {
  const level = resolveGuildAccessLevel({
    isOwner: false,
    isAdministrator: false,
    allowAdministrators: true,
    userId: "u1",
    memberRoleIds: ["r10"],
    dashboardRoles: [],
  });
  assert.equal(level, "none");
});