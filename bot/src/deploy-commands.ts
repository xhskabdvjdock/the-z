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
  const files = walk(commandsDir);
  const payload: unknown[] = [];

  for (const file of files) {
    const imported = require(file);
    const command: BotCommand = imported.default ?? imported;
    if (!command?.name) continue;
    payload.push(buildSlashCommandJSON(command));
  }

  const rest = new REST().setToken(config.token);

  if (config.devGuildId) {
    await rest.put(Routes.applicationGuildCommands(config.clientId, config.devGuildId), {
      body: payload
    });
    console.log(`✅ تم تسجيل ${payload.length} أمر على سيرفر التطوير.`);
  } else {
    await rest.put(Routes.applicationCommands(config.clientId), { body: payload });
    console.log(`✅ تم تسجيل ${payload.length} أمر عالمياً (قد يستغرق تفعيلها حتى ساعة).`);
  }
}

main().catch(console.error);
