const { test } = require("node:test");
const assert = require("node:assert");
const { matchesFilter } = require("../shared/dist/db/collection.js");

test("matchesFilter: $in matches contained value, rejects other", () => {
  assert.ok(matchesFilter({ guildId: "G", userId: "u1" }, { userId: { $in: ["u1", "u2"] } }));
  assert.ok(!matchesFilter({ guildId: "G", userId: "u9" }, { userId: { $in: ["u1", "u2"] } }));
});

test("matchesFilter: $nin excludes listed, accepts others AND missing field", () => {
  assert.ok(!matchesFilter({ userId: "u1" }, { userId: { $nin: ["u1", "u2"] } }));
  assert.ok(matchesFilter({ userId: "u5" }, { userId: { $nin: ["u1", "u2"] } }));
  // الحقل الغائب (مثل $ne) يُقبل مع $nin — سلوك Mongo المشترك
  assert.ok(matchesFilter({ guildId: "G" }, { userId: { $nin: ["u1"] } }));
});

test("matchesFilter: $in with missing field is false (explicit)", () => {
  assert.ok(!matchesFilter({ guildId: "G" }, { userId: { $in: ["u1"] } }));
});

test("matchesFilter: nested array path with $in $nin", () => {
  const doc = { guildId: "G", selfRoles: [{ id: "r1" }, { id: "r2" }] };
  assert.ok(matchesFilter(doc, { "selfRoles.id": { $in: ["r2"] } }));
  assert.ok(!matchesFilter(doc, { "selfRoles.id": { $in: ["r7"] } }));
  assert.ok(matchesFilter(doc, { "selfRoles.id": { $nin: ["r7"] } }));
});

test("matchesFilter: equality + multiple conditions (AND)", () => {
  const doc = { guildId: "G", user: "u1", status: "done" };
  assert.ok(matchesFilter(doc, { guildId: "G", status: "done" }));
  assert.ok(!matchesFilter(doc, { guildId: "G", status: "open" }));
});

test("matchesFilter: numeric gt/lt comparisons remain stable (existing behavior)", () => {
  assert.ok(matchesFilter({ totalXp: 5 }, { totalXp: { $gt: 3 } }));
  assert.ok(!matchesFilter({ totalXp: 2 }, { totalXp: { $gt: 3 } }));
  assert.ok(matchesFilter({ totalXp: 2 }, { totalXp: { $lt: 3 } }));
  assert.ok(!matchesFilter({ totalXp: 5 }, { totalXp: { $lt: 3 } }));
});

test("matchesFilter: 9 > 89 numerically (not lexically)", () => {
  assert.ok(matchesFilter({ totalXp: 90 }, { totalXp: { $gt: 9 } }));
});