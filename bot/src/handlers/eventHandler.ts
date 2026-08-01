import fs from "fs";
import path from "path";
import { ExtendedClient } from "../client";
import { BotEvent } from "../types/event";

export function loadEvents(client: ExtendedClient) {
  const eventsDir = path.join(__dirname, "..", "events");
  const files = fs.readdirSync(eventsDir).filter((f) => f.endsWith(".ts") || f.endsWith(".js"));

  for (const file of files) {
    const full = path.join(eventsDir, file);
    delete require.cache[require.resolve(full)];
    const imported = require(full);
    const event: BotEvent = imported.default ?? imported;
    if (!event?.name) continue;

    if (event.once) {
      client.once(event.name, (...args) => event.execute(client, ...args));
    } else {
      client.on(event.name, (...args) => event.execute(client, ...args));
    }
  }

  console.log(`✅ تم تحميل ${files.length} حدث.`);
}
