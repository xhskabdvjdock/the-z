import fs from "fs";
import path from "path";
import { ExtendedClient } from "../client";
import { BotContextMenu } from "../types/contextMenu";

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

/** يحمّل أوامر قائمة السياق من مجلد contextMenus/ (ملاصق للمصدر/mن المجمَّع) */
export function loadContextMenus(client: ExtendedClient) {
  const dir = path.join(__dirname, "..", "contextMenus");
  if (!fs.existsSync(dir)) return;

  for (const file of walk(dir)) {
    delete require.cache[require.resolve(file)];
    const imported = require(file);
    const menu: BotContextMenu = imported.default ?? imported;
    if (!menu?.name) continue;
    client.contextMenus.set(menu.name, menu);
  }

  console.log(`✅ تم تحميل ${client.contextMenus.size} أمر قائمة سياق.`);
}