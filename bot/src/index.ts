import { connectDatabase, closeDatabase } from "@thez/shared";
import { ExtendedClient } from "./client";
import { config } from "./config";
import { loadCommands } from "./handlers/commandHandler";
import { loadContextMenus } from "./handlers/contextMenuHandler";
import { loadEvents } from "./handlers/eventHandler";
import { registerAllModules } from "./modules";
import { logError, logInfo, sanitizeError } from "./utils/logger";
import dns from "node:dns";

// Render قد يعيد DNS بترتيب IPv6 أولًا مع عدم توفر IPv6 فعلي — اجبار IPv4
dns.setDefaultResultOrder("ipv4first");

let client: ExtendedClient | null = null;
let shuttingDown = false;

/** إيقاف آمن: إغلاق اتصال Discord + قاعدة البيانات ثم الخروج بالكود المعطى */
async function gracefulShutdown(code: number): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  logInfo("shutdown", "بدء إيقاف التشغيل الآمن...");
  try {
    if (client) {
      await client.destroy();
      client = null;
    }
  } catch (err) {
    logError("shutdown/destroy", err);
  }
  try {
    await closeDatabase();
  } catch (err) {
    logError("shutdown/db", err);
  }
  process.exit(code);
}

async function bootstrap() {
  logInfo("startup", "⏳ جاري الاتصال بقاعدة البيانات...");
  await connectDatabase(config.databaseUrl, {
    sslRootCertPath: config.dbSslRootCertPath || undefined
  });
  logInfo("startup", "✅ تم الاتصال بقاعدة البيانات بنجاح.");

  client = new ExtendedClient();

  // أخطاء عميل Discord العابرة (فقدان اتصال، راتينج...) — لا تُسقط العملية
  client.on("error", (err) => {
    // التعامل مع rate limits بشكل خاص
    if (err.message?.includes('Rate limit') || (err as any).code === 50001) {
      console.warn('[Global] Rate limit detected, auto-recovering...');
      return;
    }
    logError("client/error", err);
  });

  loadCommands(client);
  loadContextMenus(client);
  loadEvents(client);
  registerAllModules(client);

  // تسجيل الدخول: غير فتّاك — محاولات تباعدية بدل إسقاط العملية (كان يسبب
  // حلقة إعادة تشغيل تضغط على Discord بـ 429 مرارًا)
  let loginAttempt = 0;
  while (true) {
    loginAttempt++;
    try {
      logInfo("startup", `🔑 محاولة تسجيل الدخول #${loginAttempt}...`);
      await Promise.race([
        client.login(config.token),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("⏱️ انتهت مهلة الاتصال بـ Discord (120 ثانية)")), 120_000) // زيادة إلى 120 ثانية
        )
      ]);
      break;
    } catch (err) {
      logError("startup/login", err instanceof Error ? err : new Error(String(err)));
      
      // إذا كان خطأ في الـ token، لا نعيد المحاولة
      if (err instanceof Error && err.message.includes('Invalid Token')) {
        logError("startup/fatal", "❌ Token غير صحيح - لن يتم إعادة المحاولة");
        gracefulShutdown(1);
        return;
      }
      
      // إذا كان خطأ في الـ connection timeout، نعيد المحاولة
      if (err instanceof Error && err.message.includes('انتهت مهلة الاتصال')) {
        logInfo(
          "startup",
          `⚠️ المحاولة #${loginAttempt} فشلت (timeout) — تنظيف وإعادة المحاولة بعد 60 ثانية...`
        );
        await Promise.race([client.destroy().catch(() => undefined), new Promise((r) => setTimeout(r, 10_000))]);
        await new Promise((r) => setTimeout(r, 60_000));
        continue;
      }
      
      logInfo(
        "startup",
        `⚠️ المحاولة #${loginAttempt} فشلت — تنظيف وإعادة المحاولة بعد 60 ثانية...`
      );
      await Promise.race([client.destroy().catch(() => undefined), new Promise((r) => setTimeout(r, 10_000))]);
      await new Promise((r) => setTimeout(r, 60_000));
    }
  }
  logInfo("startup", "✅ تم تسجيل دخول البوت بنجاح.");
}

// -------- معالجات الأخطاء العامة --------

// وعد مرفوض بدون معالج: سجّل ولا تُسقط العملية (قد تكون خطأ غير حرج)
process.on("unhandledRejection", (reason) => {
  logError("unhandledRejection", reason instanceof Error ? reason : new Error(String(reason)));
});

// خطأ فادح غير ملتقط: لا نستمر بطريقة غير آمنة — نسجّل ونختم فورًا
process.on("uncaughtException", (err) => {
  if (isTransientNetworkError(err)) {
    // أخطاء DNS/شبكة عابرة من بيئة الاستضافة (مثل getaddrinfo ENOTFOUND) —
    // تسقط العملية بلا داعٍ. نسجّل ونستمر دون إيقاف.
    logInfo("uncaughtException", `⚠️ خطأ شبكة عابر متجاهل — استمرار العمل: ${sanitizeError(err)}`);
    return;
  }
  logError("uncaughtException", err);
  gracefulShutdown(1);
});

/** هل الخطأ عابر (DNS/شبكة) لا يستدعي إسقاط العملية؟ */
function isTransientNetworkError(err: Error): boolean {
  const code = (err as NodeJS.ErrnoException).code ?? "";
  const message = err.message ?? "";
  const transientCodes = [
    "ENOTFOUND",
    "EAI_AGAIN",
    "ECONNRESET",
    "ECONNREFUSED",
    "ETIMEDOUT",
    "EAGAIN",
    "ENETUNREACH",
    "EHOSTUNREACH",
    "EPIPE"
  ];
  return (
    transientCodes.includes(code) ||
    /getaddrinfo|ENOTFOUND|EAI_AGAIN|ECONNRESET|ETIMEDOUT|ECONNREFUSED|EPIPE/i.test(message)
  );
}

// إيقاف إداري مطلوب (Ctrl+C / kill) — إغلاق نظيف
process.on("SIGINT", () => gracefulShutdown(0));
process.on("SIGTERM", () => gracefulShutdown(0));

bootstrap().catch((err) => {
  logError("fatal/startup", err instanceof Error ? err : new Error(sanitizeError(err)));
  process.exit(1);
});