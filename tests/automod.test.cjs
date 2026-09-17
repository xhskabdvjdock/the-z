const { test, describe } = require("node:test");
const assert = require("node:assert");

const { isLinkExempt } = require("../bot/dist/modules/automod/automod.js");

describe("automod: استثناء الروابط بالرتب (linkExemptRoleIds)", () => {
  test("لا استثناء عندما تكون القائمة فارغة", () => {
    assert.equal(isLinkExempt(["1", "2"], { linkExemptRoleIds: [] }), false);
  });

  test("قائمة غائبة (بيانات قديمة) تُعامل كفارغة بلا انهيار", () => {
    assert.equal(isLinkExempt(["1"], {}), false);
    assert.equal(isLinkExempt(["1"], { linkExemptRoleIds: undefined }), false);
  });

  test("العضو يحمل إحدى الرتب المستثناة → مستثنى", () => {
    assert.equal(isLinkExempt(["rol_a", "rol_b"], { linkExemptRoleIds: ["rol_b"] }), true);
  });

  test("العضو لا يحمل أي رتبة مستثناة → غير مستثنى", () => {
    assert.equal(isLinkExempt(["rol_a"], { linkExemptRoleIds: ["rol_b", "rol_c"] }), false);
  });

  test("عضو بلا رتب نهائيًا → غير مستثنى", () => {
    assert.equal(isLinkExempt([], { linkExemptRoleIds: ["rol_b"] }), false);
  });

  test("الاستثناء دقيق: رتبة واحدة تكفي وسط قائمة كبيرة", () => {
    const exempt = ["r1", "r2", "r3", "r4", "r5"];
    assert.equal(isLinkExempt(["x", "y", "r4", "z"], { linkExemptRoleIds: exempt }), true);
    assert.equal(isLinkExempt(["x", "y", "z"], { linkExemptRoleIds: exempt }), false);
  });
});
