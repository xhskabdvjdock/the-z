import { REST, Routes } from "discord.js";
import { connectDatabase } from "@thez/shared";
import { ExtendedClient } from "./client";
import { config } from "./config";
import { loadCommands } from "./handlers/commandHandler";
import { loadEvents } from "./handlers/eventHandler";
import { registerAllModules } from "./modules";

async function validateToken(token: string): Promise<void> {
  console.log("🔍 التحقق من صحة التوكن عبر REST API...");
  const rest = new REST({ version: "10" }).setToken(token);
  try {
    const user = await rest.get(Routes.user("@me")) as any;
    console.log(`✅ التوكن صالح — البوت: ${user.username}#${user.discriminator} (${user.id})`);
  } catch (err: any) {
    const status = err?.status ?? err?.rawError?.code ?? "unknown";
    console.error(`❌ التوكن غير صالح! Status: ${status} — ${err?.message}`);
    throw new Error(`Invalid Discord token (HTTP ${status})`);
  }
}

async function bootstrap() {
  console.log("⏳ جاري الاتصال بقاعدة البيانات...");
  await connectDatabase(config.databaseUrl, { sslRootCertPath: config.dbSslRootCertPath || undefined });
  console.log("✅ تم الاتصال بقاعدة البيانات بنجاح.");

  const client = new ExtendedClient();

  loadCommands(client);
  loadEvents(client);
  registerAllModules(client);

  console.log(`🔑 DISCORD_BOT_TOKEN: ${config.token ? `موجود ✅ (${config.token.length} حرف)` : "غير موجود ❌"}`);

  if (!config.token) {
    throw new Error("DISCORD_BOT_TOKEN غير موجود في متغيرات البيئة!");
  }

  // التحقق من التوكن عبر REST أولاً (HTTP — أسرع وأوضح من WebSocket)
  await validateToken(config.token);

  console.log("🔌 جاري الاتصال بـ Discord Gateway (WebSocket)...");
  try {
    await Promise.race([
      client.login(config.token),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Discord WebSocket timeout — تجاوز 30 ثانية")), 30_000)
      )
    ]);
    console.log("✅ تم الاتصال بـ Discord Gateway بنجاح!");
  } catch (loginError: any) {
    console.error("❌ فشل الاتصال بـ Discord Gateway:", loginError?.message || loginError);
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
      }
    }
  }
}

startWithRetry();
