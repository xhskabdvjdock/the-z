import { REST, Routes } from "discord.js";
import { config } from "./config";

/** يحذف كل أوامر Slash المسجّلة حالياً (عالمياً وعلى سيرفر التطوير إن وُجد) قبل إعادة التسجيل */
async function main() {
  const rest = new REST().setToken(config.token);

  const globalCommands = (await rest.get(
    Routes.applicationCommands(config.clientId)
  )) as unknown[];
  await rest.put(Routes.applicationCommands(config.clientId), { body: [] });
  console.log(`🗑️  تم حذف ${globalCommands.length} أمر عالمي.`);

  if (config.devGuildId) {
    const guildCommands = (await rest.get(
      Routes.applicationGuildCommands(config.clientId, config.devGuildId)
    )) as unknown[];
    await rest.put(Routes.applicationGuildCommands(config.clientId, config.devGuildId), {
      body: []
    });
    console.log(`🗑️  تم حذف ${guildCommands.length} أمر خاص بسيرفر التطوير.`);
  }

  console.log("✅ تم حذف جميع الأوامر المسجّلة بنجاح.");
}

main().catch(console.error);
