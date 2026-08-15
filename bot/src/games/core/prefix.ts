import { EmbedBuilder, Message } from "discord.js";
import { ExtendedClient } from "../../client";
import { config } from "../../config";
import { IGameOverride } from "@thez/shared";
import { registry } from "./registry";
import { openLobby } from "./lobby";
import { sessionManager } from "./engine";
import { checkCooldown, registerCooldown } from "@thez/shared";

/** إعدادات الألعاب من GuildConfig — كل الحقول اختيارية للتوافق مع المستندات القديمة */
interface GameSettings {
  enabled?: boolean;
  overrides?: IGameOverride[];
}

/** إعدادات لعبة محددة: الدمج بين إعداد السيرفر والافتراضي من اللعبة */
function resolveGameOverride(
  settings: GameSettings | undefined,
  gameName: string
): IGameOverride | undefined {
  const overrides = settings?.overrides;
  if (!Array.isArray(overrides)) return undefined;
  return overrides.find((o) => o.name === gameName);
}

/**
 * معالجة أوامر الألعاب عبر البادئة.
 *   - `<prefix><game> [وسائط]` — فتح لوبي/بدء لعبة (مثال: -xo، -mafia، -hangman كلمة)
 *   - `<prefix>join <كود>` — الانضمام للعبة Cross-Guild من سيرفر آخر
 * البادئة الخاصة بالألعاب هي `-` دائمًا (مثل -xo)، وتُقبل أيضًا بادئة السيرفر.
 * يفحص إعدادات الألعاب (تفعيل/تعطيل اللعبة/الرومات المسموحة/البرودة).
 * يُرجع true إذا استُهلكت الرسالة.
 */
export async function handleGamePrefix(
  client: ExtendedClient,
  message: Message,
  prefix: string,
  games?: GameSettings
): Promise<boolean> {
  // بادئة الألعاب الثابتة "-" إضافة إلى بادئة السيرفر العامة
  const prefixes = new Set<string>(prefix ? [prefix, "-"] : ["-"]);
  const matched = [...prefixes]
    .sort((a, b) => b.length - a.length)
    .find((p) => message.content.startsWith(p));
  if (!matched) return false;

  const parts = message.content.slice(matched.length).trim().split(/\s+/);
  const command = parts[0]?.toLowerCase() ?? "";
  const args = parts.slice(1);
  if (!command) return false;

  // انضمام عبر الكود (Cross-Guild)
  if (command === "join") {
    await handleProxyJoin(client, message, args, games);
    return true;
  }

  const def = registry.get(command);
  if (!def) return false;

  // تعطيل الألعاب إجمالًا في هذا السيرفر
  if (games?.enabled === false) {
    await message.reply("الألعاب معطلة في هذا السيرفر — فعّلها من لوحة التحكم.").catch(() => null);
    return true;
  }

  // إعدادات هذه اللعبة تحديدًا
  const override = resolveGameOverride(games, def.name);
  if (override && !override.enabled) {
    await message
      .reply(`لعبة **${def.title}** معطلة في هذا السيرفر — فعّلها من لوحة التحكم.`)
      .catch(() => null);
    return true;
  }
  if (
    Array.isArray(override?.allowedChannelIds) &&
    override.allowedChannelIds.length > 0 &&
    !override.allowedChannelIds.includes(message.channelId)
  ) {
    await message.reply(`لعبة **${def.title}** لا تُلعب في هذا الروم.`).catch(() => null);
    return true;
  }

  // البرودة: override بالسيرفر > الافتراضي من اللعبة
  const cooldownSeconds = override?.cooldownSeconds ?? def.cooldownSeconds ?? 0;
  if (cooldownSeconds > 0) {
    const key = `game:${def.name}:${message.guildId}:${message.author.id}`;
    const check = checkCooldown(client.commandCooldowns, key, cooldownSeconds);
    if (!check.allowed) {
      await message
        .reply(`انتظر **${check.remainingSeconds}** ثانية قبل لعب **${def.title}** مجددًا.`)
        .catch(() => null);
      return true;
    }
    registerCooldown(client.commandCooldowns, key);
  }

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
  args: string[],
  games?: GameSettings
): Promise<void> {
  const code = args[0]?.toUpperCase();
  if (!code) {
    await message.reply("استخدم: `<البادئة>join <الكود>` للانضمام إلى لعبة عبر السيرفرات.");
    return;
  }

  // تعطيل الألعاب في سيرفر المُنضم يمنع الانضمام
  if (games?.enabled === false) {
    await message.reply("الألعاب معطلة في هذا السيرفر — فعّلها من لوحة التحكم.");
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

  // تعطيل اللعبة أو تقييد روماتها في سيرفر المُنضم
  const override = resolveGameOverride(games, session.def.name);
  if (override && !override.enabled) {
    await message
      .reply(`لعبة **${session.def.title}** معطلة في هذا السيرفر — فعّلها من لوحة التحكم.`)
      .catch(() => null);
    return;
  }
  if (
    Array.isArray(override?.allowedChannelIds) &&
    override.allowedChannelIds.length > 0 &&
    !override.allowedChannelIds.includes(message.channelId)
  ) {
    await message.reply(`لعبة **${session.def.title}** لا تُلعب في هذا الروم.`).catch(() => null);
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