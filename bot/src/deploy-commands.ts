import { REST, Routes } from "discord.js";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { config } from "./config";
import { BotCommand } from "./types/command";
import { buildSlashCommandJSON } from "./utils/slashBuilder";
import { buildContextMenuJSON } from "./utils/contextMenuBuilder";
import dns from "node:dns";

dns.setDefaultResultOrder("ipv4first");

const execAsync = promisify(exec);

function walk(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files = files.concat(walk(full));
    else if (entry.name.endsWith(".ts") || entry.name.endsWith(".js")) files.push(full);
  }
  return files;
}

async function buildShared() {
  try {
    const sharedPath = path.join(__dirname, "../../shared");
    const sharedDist = path.join(sharedPath, "dist");
    // مدمج مسبقًا في الصورة — لا نعيد البناء كل إقلاع
    if (fs.existsSync(path.join(sharedDist, "index.js"))) return;
    console.log("🔨 Building @thez/shared package...");
    await execAsync("npm run build", { cwd: sharedPath });
    console.log("✅ @thez/shared built successfully");
  } catch (error) {
    console.error("❌ Failed to build @thez/shared:", error);
    throw error;
  }
}

/** موقع مجلد الأوامر: مجاور لملف التشغيل — يطابق src في ts-node وdist عند المجمّع */
function commandsDir(): string {
  return path.join(__dirname, "commands");
}

async function main() {
  // Build shared package first
  await buildShared();

  const dir = commandsDir();
  console.log("📁 Looking for commands in:", dir);
  const files = walk(dir);
  console.log("📄 Found files:", files);
  const payload: unknown[] = [];

  for (const file of files) {
    const imported = require(file);
    const command: BotCommand = imported.default ?? imported;
    if (!command?.name) continue;
    console.log(`➕ Adding command: ${command.name}`);
    payload.push(buildSlashCommandJSON(command));
  }

  // أوامر قائمة السياق (زر الفأرة الأيمن) من مجلد contextMenus/
  const contextDir = path.join(__dirname, "contextMenus");
  if (fs.existsSync(contextDir)) {
    for (const file of walk(contextDir)) {
      const imported = require(file);
      const contextMenu = imported.default ?? imported;
      if (!contextMenu?.name) continue;
      console.log(`➕ Adding context menu: ${contextMenu.name}`);
      payload.push(buildContextMenuJSON(contextMenu));
    }
  }

  console.log(`📤 Deploying ${payload.length} commands...`);
  const startTime = Date.now();
  const rest = new REST({
    retries: 3,
    timeout: 15_000,
    makeRequest: (url: string, init: RequestInit) => fetch(url, init)
  }).setToken(config.token);

  // Retry logic with exponential backoff for rate limits
  const maxRetries = 5;
  let attempt = 0;
  
  while (attempt < maxRetries) {
    try {
      if (config.devGuildId) {
        await rest.put(Routes.applicationGuildCommands(config.clientId, config.devGuildId), {
          body: payload
        });
        console.log(`✅ تم تسجيل ${payload.length} أمر على سيرفر التطوير.`);
      } else {
        await rest.put(Routes.applicationCommands(config.clientId), { body: payload });
        console.log(`✅ تم تسجيل ${payload.length} أمر عالمياً (قد يستغرق تفعيلها حتى ساعة).`);
      }
      console.log(`⏱️ استغرق نشر الأوامر ${((Date.now() - startTime) / 1000).toFixed(1)} ثانية`);
      process.exit(0);
    } catch (error: any) {
      attempt++;
      
      if (error.code === 50001 || error.message?.includes('Rate limit')) {
        const retryAfter = error.retryAfter || 60; // default 60 seconds
        console.warn(`⚠️ Rate limit hit. Retry in ${retryAfter} seconds (attempt ${attempt}/${maxRetries})`);
        
        if (attempt >= maxRetries) {
          console.error("❌ فشل نشر الأوامر: تم تجاوز الحد الأقصى للمحاولات بسبب rate limit.");
          console.error("💡 حاول مرة أخرى بعد حوالي 21 يوم (حسب Discord).");
          process.exit(1);
        }
        
        // Wait for retry after seconds (convert to ms)
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        continue;
      }
      
      console.error("❌ فشل نشر الأوامر:", error);
      process.exit(1);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ فشل نشر الأوامر:", error);
    process.exit(1);
  });
