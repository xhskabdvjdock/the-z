import { connectDatabase } from "@thez/shared";
import { ExtendedClient } from "./client";
import { config } from "./config";
import { loadCommands } from "./handlers/commandHandler";
import { loadEvents } from "./handlers/eventHandler";
import { registerAllModules } from "./modules";

async function bootstrap() {
  console.log("⏳ جاري الاتصال بقاعدة البيانات...");
  await connectDatabase(config.databaseUrl, { sslRootCertPath: config.dbSslRootCertPath || undefined });
  console.log("✅ تم الاتصال بقاعدة البيانات بنجاح.");

  const client = new ExtendedClient();

  loadCommands(client);
  loadEvents(client);
  registerAllModules(client);

  console.log(`🔑 DISCORD_TOKEN: ${config.token ? "موجود ✅" : "غير موجود ❌"}`);

  if (!config.token) {
    throw new Error("DISCORD_TOKEN غير موجود في متغيرات البيئة!");
  }

  console.log("🔌 جاري الاتصال بـ Discord...");
  try {
    await client.login(config.token);
    console.log("✅ تم الاتصال بـ Discord — في انتظار ready event...");
  } catch (loginError: any) {
    console.error("❌ فشل الاتصال بـ Discord:", loginError?.message || loginError);
    throw loginError;
  }
}

process.on("SIGINT", () => {
  console.log("⚠️  Received SIGINT, shutting down gracefully...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("⚠️  Received SIGTERM, shutting down gracefully...");
  process.exit(0);
});

// Keep process alive with heartbeat
setInterval(() => {
  console.log(`💓 Bot heartbeat: ${new Date().toISOString()}`);
}, 5 * 60 * 1000);

async function startWithRetry() {
  const maxRetries = 5;
  const retryDelay = 5000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await bootstrap();
      return;
    } catch (error: any) {
      console.error(`❌ فشل تشغيل البوت (محاولة ${attempt}/${maxRetries}): ${error?.message || error}`);

      if (attempt < maxRetries) {
        console.log(`⏳ إعادة المحاولة بعد ${retryDelay / 1000} ثواني...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      } else {
        console.error("❌ تم الوصول للحد الأقصى من المحاولات. البوت متوقف.");
        // لا نُوقف العملية لأن الداشبورد لا يزال يعمل
      }
    }
  }
}

startWithRetry();
