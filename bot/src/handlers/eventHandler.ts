import fs from "fs";
import path from "path";
import { ExtendedClient } from "../client";
import { BotEvent } from "../types/event";
import { logError } from "../utils/logger";

export function loadEvents(client: ExtendedClient) {
  const eventsDir = path.join(__dirname, "..", "events");
  const files = fs.readdirSync(eventsDir).filter((f) => f.endsWith(".ts") || f.endsWith(".js"));

  for (const file of files) {
    const full = path.join(eventsDir, file);
    delete require.cache[require.resolve(full)];
    const imported = require(full);
    const event: BotEvent = imported.default ?? imported;
    if (!event?.name) continue;

    /** تنفيذ آمن بحيث لا يسقط خطأ أي حدث العملية كاملة (ويسجل ذكيًا دون كشف الأسرار) */
    const safeExecute = (...args: unknown[]) => {
      Promise.resolve()
        .then(() => event.execute(client, ...args))
        .catch((err) => logError(`event:${event.name}`, err));
    };

    if (event.once) {
      client.once(event.name, safeExecute as any);
    } else {
      client.on(event.name, safeExecute as any);
    }
  }

  console.log(`✅ تم تحميل ${files.length} حدث.`);
}