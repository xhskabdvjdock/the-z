import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  EmbedBuilder,
  Message
} from "discord.js";
import { ExtendedClient } from "../../client";
import { config } from "../../config";
import { logError, logInfo } from "../../utils/logger";
import { GameDefinition } from "./types";
import { createSession, GameSessionImpl, sessionManager, startGame } from "./engine";

const LOBBY_TTL_MS = 120_000; // سيرفر/لوبي غير نشط يُلغى بعد دقيقتين

function playerList(session: GameSessionImpl): string {
  if (!session.players.length) return "لا يوجد لاعبون بعد.";
  return session.players
    .map((p, i) => `${i + 1}. <@${p.id}>${p.id === session.hostId ? " (المضيف)" : ""}`)
    .join("\n");
}

export function lobbyRender(session: GameSessionImpl): {
  content: string;
  embeds: EmbedBuilder[];
  rows: ActionRowBuilder<ButtonBuilder>[];
} {
  const def = session.def;
  const embed = new EmbedBuilder()
    .setColor(config.defaultColor)
    .setTitle(`لوبي ${def.title}`)
    .setDescription(
      `**${def.description}**\n\n` +
        `اللاعبون: ${session.players.length}/${def.maxPlayers}\n` +
        `الحد الأدنى للبدء: ${def.minPlayers}\n\n` +
        `**اللاعبون:**\n${playerList(session)}`
    )
    .setFooter({ text: `اللعبة: ${def.name}` });

  if (def.supportsCrossGuild && session.crossGuild) {
    embed.addFields({
      name: "اللعب عبر السيرفرات",
      value: `شارك الآخرون عبر الأمر: \`${session.crossGuild.code}\` — يجمعهم بـ \`-join\``,
      inline: false
    });
  }

  const canStart =
    session.status === "LOBBY" &&
    session.players.length >= def.minPlayers;

  const joinDisabled = session.players.length >= def.maxPlayers;

  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`game:${session.id}:join`)
        .setLabel("انضمام")
        .setStyle(ButtonStyle.Success)
        .setDisabled(joinDisabled),
      new ButtonBuilder()
        .setCustomId(`game:${session.id}:leave`)
        .setLabel("مغادرة")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`game:${session.id}:start`)
        .setLabel("بدء")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(!canStart),
      new ButtonBuilder()
        .setCustomId(`game:${session.id}:cancel`)
        .setLabel("إلغاء")
        .setStyle(ButtonStyle.Danger)
    );

  return { content: "", embeds: [embed], rows: [row] };
}

/**
 * فتح لوبي للعبة جماعية أو بدء فوري للعبة فردية.
 * يُرجع الجلسة بعد إرسال رسالتها الأولى (أو null عند فشل الإرسال).
 */
export async function openLobby(
  client: ExtendedClient,
  def: GameDefinition,
  opts: {
    guildId: string;
    channelId: string;
    hostId: string;
    hostTag: string;
    args: string[];
  }
): Promise<GameSessionImpl | null> {
  // منع اللاعب من فتح/الدخول في أكثر من جلسة نشطة
  const busy = sessionManager.getByPlayer(opts.hostId);
  if (busy) {
    logInfo(
      "games/openLobby",
      `رُفض فتح ${def.name} — المضيف ${opts.hostId} في جلسة نشطة (${busy.def.name})`
    );
    return null;
  }

  const session = createSession(client, def, {
    guildId: opts.guildId,
    channelId: opts.channelId,
    hostId: opts.hostId,
    hostTag: opts.hostTag
  });

  session.players.push({
    id: opts.hostId,
    tag: opts.hostTag,
    username: opts.hostTag,
    avatarURL: "",
    joinedAt: Date.now(),
    ready: true,
    score: 0,
    alive: true,
    data: {}
  });

  if (def.parseArgs) {
    const err = await def.parseArgs(opts.args, session);
    if (err) {
      logInfo("games/openLobby", `فشل parseArgs لـ ${def.name}: ${err}`);
      sessionManager.remove(session);
      return null;
    }
  }

  if (def.category === "singleplayer") {
    // لا لوبي للألعاب الفردية — بدء فوري
    session.status = "STARTING";
    session.players[0].ready = true;
    session.startedAt = Date.now();
    try {
      await def.onStart(session);
    } catch (err) {
      logError(`games/onStart/${def.name}`, err);
      sessionManager.remove(session);
      return null;
    }
    session.status = "PLAYING";
    await session.writeRecord();
    sessionManager.add(session);
    session.armLifetime(30 * 60_000);
    session.touch();
    await session.renderNow();
    return session;
  }

  // لوبي جماعي
  session.status = "LOBBY";
  sessionManager.add(session);
  session.armLifetime(10 * 60_000);

  const payload = lobbyRender(session);
  const channel = await client.channels.fetch(opts.channelId).catch((err) => {
    logError("games/openLobby/fetchChannel", err);
    return null;
  });
  if (!channel || !("isTextBased" in channel) || !channel.isTextBased()) {
    logInfo("games/openLobby", `فشل الوصول لقناة ${opts.channelId} لـ ${def.name}`);
    await session.cancel("تعذّر الوصول إلى القناة.");
    return null;
  }
  const sent = await (channel as any).send(payload).catch((err: unknown) => {
    logError("games/openLobby/send", err);
    return null;
  });
  if (!sent) {
    logInfo("games/openLobby", `فشل إرسال رسالة اللوبي لـ ${def.name} في ${opts.channelId}`);
    await session.cancel("تعذّر إرسال رسالة اللعبة.");
    return null;
  }
  session.messageId = sent.id;
  await session.writeRecord();

  // إلغاء تلقائي إذا لم يبدأ أحد
  session.setTimer("lobby", LOBBY_TTL_MS, () => {
    if (session.status === "LOBBY" && session.players.length <= 1) {
      session.expire("انتهت مهلة اللوبي — لم يبدأ أي لاعب.").catch(() => null);
    }
  });

  return session;
}

/** معالجة أزرار اللوبي (join/leave/start/cancel) */
export async function handleLobbyAction(
  session: GameSessionImpl,
  action: string,
  interaction: ButtonInteraction
): Promise<void> {
  await interaction.deferUpdate().catch(() => null);

  const userId = interaction.user.id;

  switch (action) {
    case "join": {
      if (session.status !== "LOBBY") return;
      if (session.getPlayer(userId)) return;
      if (session.players.length >= session.def.maxPlayers) return;
      const other = sessionManager.getByPlayer(userId);
      if (other && other.id !== session.id) return;
      session.players.push({
        id: userId,
        tag: interaction.user.tag,
        username: interaction.user.username,
        avatarURL: interaction.user.displayAvatarURL(),
        joinedAt: Date.now(),
        ready: true,
        score: 0,
        alive: true,
        data: {}
      });
      sessionManager.add(session);
      await session.renderNow();
      break;
    }
    case "leave": {
      if (session.status !== "LOBBY") return;
      const idx = session.players.findIndex((p) => p.id === userId);
      if (idx === -1) return;
      if (session.hostId === userId) {
        await session.cancel("غادر المضيف اللوبي.");
        return;
      }
      session.players.splice(idx, 1);
      sessionManager.add(session);
      await session.renderNow();
      break;
    }
    case "start": {
      if (session.status !== "LOBBY") return;
      if (userId !== session.hostId) return;
      const ok = await startGame(session);
      if (!ok) {
        await session.notify("لا يمكن البدء — عدد اللاعبين غير كافٍ أو خطأ أثناء الإقلاع.");
      }
      break;
    }
    case "cancel": {
      if (userId !== session.hostId) return;
      await session.cancel("أُلغيت الجلسة بواسطة المضيف.");
      break;
    }
  }
}