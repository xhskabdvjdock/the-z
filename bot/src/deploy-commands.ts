import { REST, Routes } from "discord.js";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { config } from "./config";
import { BotCommand } from "./types/command";
import { buildSlashCommandJSON } from "./utils/slashBuilder";

const execAsync = promisify(exec);

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

async function main() {
  // Build shared package first
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

  console.log(`📤 Deploying ${payload.length} commands...`);
  const rest = new REST().setToken(config.token);
  const signal = AbortSignal.timeout(60_000);

  if (config.devGuildId) {
    await rest.put(Routes.applicationGuildCommands(config.clientId, config.devGuildId), {
      body: payload,
      signal
    });
    console.log(`✅ تم تسجيل ${payload.length} أمر على سيرفر التطوير.`);
  } else {
    await rest.put(Routes.applicationCommands(config.clientId), { body: payload, signal });
    console.log(`✅ تم تسجيل ${payload.length} أمر عالمياً (قد يستغرق تفعيلها حتى ساعة).`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ فشل نشر الأوامر:", error);
    process.exit(1);
  });
