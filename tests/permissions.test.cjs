const { test } = require("node:test");
const assert = require("node:assert");
const { MemoryRateLimiter } = require("../shared/dist/utils/rateLimit.js");
const {
  verifyCommandPermission,
} = require("../bot/dist/utils/permissions.js");

// ---------- RateLimiter ----------
test("rateLimit: allows up to limit, then rejects with retryAfter", () => {
  const limiter = new MemoryRateLimiter({ limit: 2, windowMs: 1000 });
  const now = Date.now();
  assert.equal(limiter.check("g:u", now).allowed, true);
  assert.equal(limiter.check("g:u", now).allowed, true);
  const denied = limiter.check("g:u", now);
  assert.equal(denied.allowed, false);
  assert.ok(denied.retryAfterMs > 0 && denied.retryAfterMs <= 1000);
});

test("rateLimit: resets after window", () => {
  const limiter = new MemoryRateLimiter({ limit: 1, windowMs: 500 });
  const now = Date.now();
  assert.equal(limiter.check("g:u", now).allowed, true);
  assert.equal(limiter.check("g:u", now + 10).allowed, false);
  assert.equal(limiter.check("g:u", now + 501).allowed, true);
});

test("rateLimit: keys are isolated", () => {
  const limiter = new MemoryRateLimiter({ limit: 1, windowMs: 1000 });
  const now = Date.now();
  assert.equal(limiter.check("a", now).allowed, true);
  assert.equal(limiter.check("b", now).allowed, true);
  assert.equal(limiter.check("a", now + 5).allowed, false);
});

// ---------- verifyCommandPermission ----------
// المحاكاة: الصلاحيات كأقنعة bits مثل discord.js (has(bits) يقارن بالقناع)
const BAN = 1n << 8n; // BanMembers
const ADMIN = 1n << 3n;

function member(hasFn) {
  return { permissions: { has: hasFn } };
}
function channel(hasFn) {
  return { permissionsFor: () => ({ has: hasFn }) };
}

test("verifyCommandPermission: no defaultMemberPermissions → allowed", () => {
  const cmd = { defaultMemberPermissions: undefined };
  const m = member((bits) => false);
  assert.equal(verifyCommandPermission(cmd, m, channel((bits) => false)).allowed, true);
});

test("verifyCommandPermission: member with permission in channel → allowed", () => {
  const cmd = { defaultMemberPermissions: BAN };
  const m = member((p) => (typeof p === "string" ? p === "Administrator" : (p & BAN) === BAN));
  const ch = channel((p) => (typeof p === "string" ? p === "Administrator" : (p & BAN) === BAN));
  assert.ok(verifyCommandPermission(cmd, m, ch).allowed);
});

test("verifyCommandPermission: member without permission → denied with reason", () => {
  const cmd = { defaultMemberPermissions: BAN };
  const r = verifyCommandPermission(cmd, member(() => false), channel(() => false));
  assert.equal(r.allowed, false);
  assert.ok(r.reason && r.reason.length > 0);
});

test("verifyCommandPermission: Administrator bypasses (no permission needed)", () => {
  const cmd = { defaultMemberPermissions: BAN };
  const adminMember = { permissions: { has: (p) => p === "Administrator" } };
  const r = verifyCommandPermission(cmd, adminMember, channel(() => false));
  assert.ok(r.allowed);
});

test("verifyCommandPermission: channel restrictions respected (unrelated perms denied)", () => {
  const cmd = { defaultMemberPermissions: BAN };
  // العضو يملك الصلاحية في السيرفر لكن القناة تحجبها عن منحها له
  const m = member((p) => (typeof p === "string" ? false : (p & BAN) === BAN));
  const ch = channel(() => false);
  assert.equal(verifyCommandPermission(cmd, m, ch).allowed, false);
});
