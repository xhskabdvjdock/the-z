import { EmbedBuilder, Message } from "discord.js";
import { ExtendedClient } from "../../client";
import { config } from "../../config";
import { registry } from "./registry";
import { openLobby } from "./lobby";
import { sessionManager } from "./engine";

/**
 * معالجة أوامر الألعاب عبر البادئة.
 *   - `<prefix><game> [وسائط]` — فتح لوبي/بدء لعبة (مثال: -xo، -mafia، -hangman كلمة)
 *   - `<prefix>join <كود>` — الانضمام للعبة Cross-Guild من سيرفر آخر
 * يُرجع true إذا استُهلكت الرسالة.
 */
export async function handleGamePrefix(
  client: ExtendedClient,
  message: Message,
  prefix: string
): Promise<boolean> {
  if (!prefix || !message.content.startsWith(prefix)) return false;

  const parts = message.content.slice(prefix.length).trim().split(/\s+/);
  const command = parts[0]?.toLowerCase() ?? "";
  const args = parts.slice(1);
  if (!command) return false;

  // انضمام عبر الكود (Cross-Guild)
  if (command === "join") {
    await handleProxyJoin(client, message, args);
    return true;
  }

  const def = registry.get(command);
  if (!def) return false;

  if (def.category === "multiplayer" && def.minPlayers > 1) {
    const busy = sessionManager.getByPlayer(message.author.id);
    if (busy) {
      await message.reply("أنت في جلسة نشطة بالفعل — أنهِها قبل فتح لعبة جديدة.").catch(() => null);
      return true;
    }
  }

  const session = await openLobby(client, def, {
    guildId: message.guild!.id,
    channelId: message.channelId,
    hostId: message.author.id,
    hostTag: message.author.tag,
    args
  });

  if (!session) {
    // parseArgs أو فشل الإرسال — نُخبر اللاعب
    await message
      .reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle("تعذّر بدء اللعبة")
            .setDescription(
              "ربما الوسائط غير صالحة (تحقق من \`-help\`) أو كنت في جلسة نشطة أخرى."
            )
        ]
      })
      .catch(() => null);
  }

  return true;
}

async function handleProxyJoin(
  client: ExtendedClient,
  message: Message,
  args: string[]
): Promise<void> {
  const code = args[0]?.toUpperCase();
  if (!code) {
    await message.reply("استخدم: `<البادئة>join <الكود>` للانضمام إلى لعبة عبر السيرفرات.");
    return;
  }

  const session = sessionManager.getByProxyCode(code);
  if (!session || !session.crossGuild) {
    await message.reply("لم يتم العثور على لعبة بهذا الكود (قد تكون انتهت).");
    return;
  }

  if (session.status !== "LOBBY") {
    await message.reply("اللعبة بدأت بالفعل — لا يمكن الانضمام الآن.");
    return;
  }

  if (session.getPlayer(message.author.id)) {
    await message.reply("أنت مشترك في هذه اللعبة بالفعل.");
    return;
  }

  if (session.players.length >= session.def.maxPlayers) {
    await message.reply("اللوبي مكتمل — لا يمكن الانضمام.");
    return;
  }

  const busy = sessionManager.getByPlayer(message.author.id);
  if (busy && busy.id !== session.id) {
    await message.reply("أنت في جلسة نشطة أخرى — أنهِها أولًا.");
    return;
  }

  session.players.push({
    id: message.author.id,
    tag: message.author.tag,
    username: message.author.username,
    avatarURL: message.author.displayAvatarURL(),
    joinedAt: Date.now(),
    ready: true,
    score: 0,
    alive: true,
    data: {}
  });
  sessionManager.add(session);
  session.addRemoteChannel(message.guild!.id, message.channelId);
  await session.renderNow();

  await message
    .reply({
      embeds: [
        new EmbedBuilder()
          .setColor(config.defaultColor)
          .setDescription(`انضممت إلى **${session.def.title}** من سيرفرك — ستظهر اللعبة هنا.`)
      ]
    })
    .catch(() => null);
}