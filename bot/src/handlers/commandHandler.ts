import fs from "fs";
import path from "path";
import { ExtendedClient } from "../client";
import { BotCommand } from "../types/command";
import { getGuildConfig } from "../utils/guildConfig";

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

export function loadCommands(client: ExtendedClient) {
  const commandsDir = path.join(__dirname, "..", "commands");
  const files = walk(commandsDir);

  for (const file of files) {
    delete require.cache[require.resolve(file)];
    const imported = require(file);
    const command: BotCommand = imported.default ?? imported;
    if (!command?.name) continue;
    client.commands.set(command.name, command);
  }

  console.log(`✅ تم تحميل ${client.commands.size} أمر.`);
}

export async function checkCommandOverride(client: ExtendedClient, commandName: string, guildId: string): Promise<{ allowed: boolean; reason?: string }> {
  const gConfig = await getGuildConfig(client, guildId);
  const override = gConfig.commandOverrides?.find((c) => c.name === commandName);

  if (!override) return { allowed: true };

  if (override.enabled === false) {
    return { allowed: false, reason: "This command is disabled in this server." };
  }

  return { allowed: true };
}
