import { connectDatabase } from "@thez/shared";
import { ExtendedClient } from "./client";
import { config } from "./config";
import { loadCommands } from "./handlers/commandHandler";
import { loadEvents } from "./handlers/eventHandler";
import { registerAllModules } from "./modules";

async function main() {
  // قاعدة البيانات
  console.log("⏳ الاتصال بقاعدة البيانات...");
  await connectDatabase(config.databaseUrl, {
    sslRootCertPath: config.dbSslRootCertPath || undefined,
  });
  console.log("✅ قاعدة البيانات متصلة.");

  // التوكن
  const token = process.env.DISCORD_BOT_TOKEN || process.env.DISCORD_TOKEN || "";
  if (!token) {
    console.error("❌ لا يوجد توكن! أضف DISCORD_BOT_TOKEN في Environment Variables.");
    process.exit(1);
  }
  console.log(`🔑 التوكن موجود (${token.length} حرف)`);

  // البوت
  const client = new ExtendedClient();
  loadCommands(client);
  loadEvents(client);
  registerAllModules(client);

  // الاتصال بـ Discord
  console.log("🔌 الاتصال بـ Discord...");
  await client.login(token);
  // ready event في ready.ts سيطبع اسم البوت عند النجاح
}

// تشغيل
main().catch((err) => {
  console.error("❌ البوت توقف:", err?.message || err);
  process.exit(1); // Render سيعيد التشغيل تلقائياً
});

process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));

// heartbeat كل 5 دقائق
setInterval(() => {
  console.log(`💓 ${new Date().toISOString()}`);
}, 5 * 60 * 1000);
