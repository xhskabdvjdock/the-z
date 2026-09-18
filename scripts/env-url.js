// ============================================================
// تحديد NEXTAUTH_URL بشكل آمن (CommonJS خالص — يُستدعى من start.js ويُختبر مباشرة)
// ============================================================
//
// NEXTAUTH_URL الصحيح ضروري لتسجيل الدخول عبر Discord (Redirect URL) ولروابط
// الأمر ,dw. القيم الخاطئة (محلية أو تجريبية أو دومين قديم) تكسر الاثنين بصمت،
// لذلك نتحقق هنا ونرجع إلى RENDER_EXTERNAL_URL الصادر من Render عند اللزوم.

/** عناوين لا تصلح للإنتاج: محلية أو قيم تجريبية من ملفات الأمثلة */
const UNUSABLE_URL_RE =
  /(localhost|127\.0\.0\.1|0\.0\.0\.0|your[-_]|-url(?=[.-]|$)|^url[.-]|xx{2,}|changeme|placeholder|example\.|domain\.com|\.invalid$|\.test$)/i;

/** نطاقات Render التلقائية (مثل the-z-o3lt.onrender.com) — فريدة لكل خدمة */
const RENDER_HOST_RE = /\.onrender\.com$/i;

/**
 * @param {Record<string, string|undefined>} env
 * @param {(msg: string) => void} [log]
 * @returns {string} العنوان الذي سيُمرَّر للوحة (قد يكون "" إن لم يوجد شيء)
 */
function resolveNextAuthUrl(env = process.env, log = (msg) => console.log(msg)) {
  const explicit = (env.NEXTAUTH_URL || "").trim().replace(/\/+$/, "");
  const renderUrl = (env.RENDER_EXTERNAL_URL || "").trim().replace(/\/+$/, "");
  const fallback = renderUrl || (env.DASHBOARD_URL || "").trim().replace(/\/+$/, "");

  if (!explicit) {
    if (fallback) log(`[SYSTEM] ℹ️ NEXTAUTH_URL غير مضبوط — استخدام: ${fallback}`);
    else log("[SYSTEM] ⚠️ لا يوجد NEXTAUTH_URL ولا RENDER_EXTERNAL_URL — تسجيل الدخول وروابط ,dw لن تعمل.");
    return fallback;
  }

  // 1) قيمة محلية أو تجريبية معروفة → تُرفض دائمًا
  if (UNUSABLE_URL_RE.test(explicit)) {
    log(`[SYSTEM] ⚠️ NEXTAUTH_URL غير صالح للإنتاج (${explicit}) — قيمة محلية أو تجريبية.`);
    if (fallback && fallback !== explicit) {
      log(`[SYSTEM] ↩️ استخدام رابط الخدمة العام بدلًا منه: ${fallback}`);
      return fallback;
    }
    return explicit;
  }

  // 2) دومين onrender.com مختلف عن دومين الخدمة الحالي → قيمة قديمة من نشر سابق
  if (renderUrl) {
    try {
      const explicitHost = new URL(explicit).host;
      const renderHost = new URL(renderUrl).host;

      if (RENDER_HOST_RE.test(explicitHost) && RENDER_HOST_RE.test(renderHost) && explicitHost !== renderHost) {
        log(`[SYSTEM] ⚠️ NEXTAUTH_URL (${explicitHost}) يخص خدمة Render أخرى — قيمة قديمة على الأرجح.`);
        log(`[SYSTEM] ↩️ استخدام رابط الخدمة الحالي بدلًا منه: ${renderUrl}`);
        return renderUrl;
      }


      if (explicitHost !== renderHost) {
        log(`[SYSTEM] ⚠️ NEXTAUTH_URL (${explicitHost}) يخالف رابط خدمة Render (${renderHost}).`);
        log("[SYSTEM] 💡 إن لم يكن نطاقًا مخصصًا مربوطًا فعلًا، صحّح المتغير أو أضف Redirect URL مطابقًا في Discord.");
      }
    } catch {
      log(`[SYSTEM] ⚠️ NEXTAUTH_URL غير صالح كرابط: ${explicit}`);
    }
  }

  return explicit;
}

module.exports = { resolveNextAuthUrl, UNUSABLE_URL_RE, RENDER_HOST_RE };
