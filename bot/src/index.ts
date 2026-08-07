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

  await client.login(config.token);
}

// Global error handlers
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  // Don't exit immediately, log and continue
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit immediately, log and continue
});

process.on('SIGINT', () => {
  console.log('⚠️  Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('⚠️  Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Auto-restart on crash with delay
async function startWithRetry() {
  let retryCount = 0;
  const maxRetries = 5;
  const retryDelay = 5000; // 5 seconds

  while (retryCount < maxRetries) {
    try {
      await bootstrap();
      break; // If successful, exit the retry loop
    } catch (error) {
      retryCount++;
      console.error(`❌ فشل تشغيل البوت (محاولة ${retryCount}/${maxRetries}):`, error);
      
      if (retryCount < maxRetries) {
        console.log(`⏳ إعادة المحاولة بعد ${retryDelay / 1000} ثواني...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      } else {
        console.error('❌ تم الوصول للحد الأقصى من المحاولات. توقف البوت.');
        process.exit(1);
      }
    }
  }
}

startWithRetry();
