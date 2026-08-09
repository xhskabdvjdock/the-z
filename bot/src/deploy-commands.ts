import { exec } from "child_process";
import { promisify } from "util";
import { config } from "./config";
import { BotCommand } from "./types/command";
import { buildSlashCommandJSON } from "./utils/slashBuilder";
import fs from "fs";
import path from "path";

const execAsync = promisify(exec);
const API_BASE = "https://discord.com/api/v10";

function walk(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files = files.concat(walk(full));
    else if (entry.name.endsWith(".ts")) files.push(full);
  }
  return files;
}

async function buildShared() {
  try {
    console.log("🔨 Building @thez/shared package...");
    const sharedPath = path.join(__dirname, "../../shared");
    await execAsync("npm run build", { cwd: sharedPath });
    console.log("✅ @thez/shared built successfully");
  } catch (error) {
    console.error("❌ Failed to build @thez/shared:", error);
    throw error;
  }
}

async function postCommands(body: string) {
  const route = config.devGuildId
    ? `/applications/${config.clientId}/guilds/${config.devGuildId}/commands`
    : `/applications/${config.clientId}/commands`;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(`${API_BASE}${route}`, {
        method: "PUT",
        headers: {
          Authorization: `Bot ${config.token}`,
          "Content-Type": "application/json"
        },
        body,
        signal: AbortSignal.timeout(45_000)
      });

      const text = await res.text();

      if (res.ok) {
        console.log(`✅ تم تسجيل ${JSON.parse(text).length} أمر (حالة HTTP ${res.status}).`);
        return;
      }

      if (res.status === 429) {
        let retryAfter = 5;
        try {
          retryAfter = JSON.parse(text).retry_after ?? 5;
        } catch {
          /* ignore */
        }
        console.log(`⏳ Discord 429 — الانتظار ${retryAfter} ثانية ثم إعادة المحاولة (${attempt}/3)`);
        await new Promise((r) => setTimeout(r, retryAfter * 1000));
        continue;
      }

      console.error(`❌ Discord رد بكود ${res.status}: ${text.slice(0, 400)}`);
      process.exit(1);
    } catch (error) {
      const name = (error as Error)?.name;
      if (name === "AbortError" || name === "TimeoutError") {
        console.error(`❌ مهلة الطلب انتهت (محاولة ${attempt}/3) — الشبكة من Render إلى Discord غير مستقرة؟`);
        if (attempt === 3) {
          console.error("❌ فشل نشر الأوامر نهائيًا بعد 3 محاولات.");
          process.exit(1);
        }
      } else {
        console.error("❌ خطأ غير متوقع أثناء النشر:", error);
        process.exit(1);
      }
    }
  }
}

async function main() {
  await buildShared();

  const commandsDir = path.join(__dirname, "commands");
  console.log("📁 Looking for commands in:", commandsDir);
  const files = walk(commandsDir);
  console.log("📄 Found files:", files);
  const payload: unknown[] = [];

  for (const file of files) {
    const imported = require(file);
    const command: BotCommand = imported.default ?? imported;
    if (!command?.name) continue;
    console.log(`➕ Adding command: ${command.name}`);
    payload.push(buildSlashCommandJSON(command));
  }

  console.log(`📤 Deploying ${payload.length} commands (${JSON.stringify(payload).length} bytes)...`);
  await postCommands(JSON.stringify(payload));
  console.log(`✅ ${config.devGuildId ? "سيرفر التطوير" : "عالمياً"} — تم النشر بنجاح.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ فشل نشر الأوامر:", error);
    process.exit(1);
  });