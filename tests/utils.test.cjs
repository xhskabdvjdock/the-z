const { test } = require("node:test");
const assert = require("node:assert");

test("db preflight: getPool throws before connect (clear error, no crash)", async () => {
  const { getPool } = require("../shared/dist/db/pool.js");
  try {
    getPool();
    assert.fail("getPool يجب أن يرمي قبل تهيئة قاعدة البيانات");
  } catch (err) {
    assert.match(String(err.message), /قاعدة|غير متصلة|Database|connect/i);
  }
});

test("logger: sanitizeError hides tokens/keys from error output", async () => {
  const { sanitizeError } = require("../bot/dist/utils/logger.js");
  const sample = new Error(
    `http://localhost/api?access_token=SECRETTOKEN123&clientSecret=CRED456&key=abc`
  );
  const clean = sanitizeError(sample);
  assert.ok(!clean.includes("SECRETTOKEN123"));
  assert.ok(!clean.includes("CRED456"));
  assert.ok(!clean.includes("=abc"));
  assert.ok(clean.includes("[REDACTED]"));
});

test("cooldown: getCooldownKey separators & uniqueness", () => {
  const { getCooldownKey } = require("../shared/dist/utils/cooldown.js");
  assert.equal(getCooldownKey("ban", "g1", "u1"), "ban:g1:u1");
  assert.notEqual(getCooldownKey("ban", "g1", "u1"), getCooldownKey("kick", "g1", "u1"));
  assert.notEqual(getCooldownKey("ban", "g1", "u1"), getCooldownKey("ban", "g2", "u1"));
});