const { test, describe } = require("node:test");
const assert = require("node:assert");

const { resolveNextAuthUrl } = require("../scripts/env-url.js");

/** مُجمِّع لوجات وهمي لتفادي طباعة النظام أثناء الاختبار */
function makeLog() {
  const lines = [];
  return { lines, log: (msg) => lines.push(msg) };
}

function resolve(env) {
  const { lines, log } = makeLog();
  const url = resolveNextAuthUrl(env, log);
  return { url, logs: lines, warned: lines.some((l) => l.includes("⚠️")) };
}

describe("nextauthUrl: تحديد NEXTAUTH_URL في الإنتاج", () => {
  const RENDER = "https://the-z-o3lt.onrender.com";

  test("قيمة صحيحة مطابقة لرابط الخدمة تُستخدم كما هي بلا تحذير", () => {
    const r = resolve({ NEXTAUTH_URL: RENDER, RENDER_EXTERNAL_URL: RENDER });
    assert.equal(r.url, RENDER);
    assert.equal(r.warned, false);
  });

  test("دومين onrender.com قديم يُرفض ويُستبدل برابط الخدمة الحالي", () => {
    const r = resolve({
      NEXTAUTH_URL: "https://the-z-8c94.onrender.com",
      RENDER_EXTERNAL_URL: RENDER
    });
    assert.equal(r.url, RENDER, "يجب استخدام رابط الخدمة الحالي");
    assert.ok(r.warned);
  });

  test("قيمة تجريبية من ملفات الأمثلة تُرفض", () => {
    for (const bad of [
      "https://your-dashboard-url.onrender.com",
      "https://example.com",
      "https://demo-url.onrender.com",
      "https://foo.invalid"
    ]) {
      const r = resolve({ NEXTAUTH_URL: bad, RENDER_EXTERNAL_URL: RENDER });
      assert.equal(r.url, RENDER, `يجب رفض ${bad}`);
      assert.ok(r.warned);
    }
  });

  test("قيمة محلية تُرفض لصالح رابط الخدمة", () => {
    for (const bad of ["http://localhost:3000", "http://127.0.0.1:3000", "http://0.0.0.0:3000"]) {
      const r = resolve({ NEXTAUTH_URL: bad, RENDER_EXTERNAL_URL: RENDER });
      assert.equal(r.url, RENDER);
    }
  });

  test("نطاق مخصص حقيقي يُحترم مع تحذير فقط (بلا استبدال)", () => {
    const r = resolve({
      NEXTAUTH_URL: "https://panel.myserver.net",
      RENDER_EXTERNAL_URL: RENDER
    });
    assert.equal(r.url, "https://panel.myserver.net");
    assert.ok(r.warned);
  });

  test("غير مضبوط: يُستخدم رابط Render مع إشعار بلا تحذير", () => {
    const r = resolve({ RENDER_EXTERNAL_URL: RENDER });
    assert.equal(r.url, RENDER);
    assert.equal(r.warned, false);
  });

  test("غير مضبوط مع DASHBOARD_URL فقط: يُستخدم DASHBOARD_URL", () => {
    const r = resolve({ DASHBOARD_URL: "https://dash.myserver.net" });
    assert.equal(r.url, "https://dash.myserver.net");
  });

  test("لا شيء مضبوط نهائيًا: تحذير واضح وقيمة فارغة", () => {
    const r = resolve({});
    assert.equal(r.url, "");
    assert.ok(r.warned);
  });

  test("إزالة الشرطة الأخيرة من القيم", () => {
    const r = resolve({ NEXTAUTH_URL: "https://the-z-o3lt.onrender.com///", RENDER_EXTERNAL_URL: RENDER });
    assert.equal(r.url, RENDER);
  });

  test("قيمة غير صالحة كرابط لا تُسقط العملية", () => {
    const r = resolve({ NEXTAUTH_URL: RENDER, RENDER_EXTERNAL_URL: "not-a-url" });
    assert.equal(r.url, RENDER);
  });
});
