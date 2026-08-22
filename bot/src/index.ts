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

  // إضافة global error handler للتعامل مع rate limits
  client.on('error', (error) => {
    if (error.message?.includes('Rate limit') || error.code === 50001) {
      console.warn('[Global] Rate limit detected, auto-recovering...');
    } else {
      console.error('[Global] Client error:', error);
    }
  });

  loadCommands(client);
  loadEvents(client);
  registerAllModules(client);

  await client.login(config.token);
}

bootstrap().catch((err) => {
  console.error("❌ فشل تشغيل البوت:", err);
  process.exit(1);
});
