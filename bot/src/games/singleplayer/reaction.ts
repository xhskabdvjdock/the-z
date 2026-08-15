import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} from "discord.js";
import { GameDefinition } from "../core/types";

const MIN_DELAY = 2_000;
const MAX_DELAY = 6_000;

const def: GameDefinition<{ armed: boolean; armedAt: number }> = {
  name: "reaction",
  aliases: ["رد-الفعل", "rt"],
  title: "زمن رد الفعل",
  description: "اضغط في أسرع وقت ممكن بعد ظهور الإشارة.",
  instructions:
    "ستظهر رسالة استعداد ثم تتغير إلى (اضغط الآن).\n" +
    "الضغط قبل الإشارة لا يُحتسب.\n" +
    "سرعتك بالمللي ثانية تُسجل كأفضل نتيجة.",
  category: "singleplayer",
  minPlayers: 1,
  maxPlayers: 1,
  durationLabel: "10 ثوانٍ",
  cooldownSeconds: 3,

  onStart(session) {
    session.gameData = { armed: false, armedAt: 0 };
    session.phase = "playing";
    const delay = MIN_DELAY + Math.floor(Math.random() * (MAX_DELAY - MIN_DELAY));
    session.setTimer("arm", delay, () => {
      if (session.status !== "PLAYING") return;
      const data = session.gameData as { armed: boolean; armedAt: number };
      data.armed = true;
      data.armedAt = Date.now();
      session.renderNow().catch(() => null);
    });
  },

  onAction(session, action) {
    if (action.type !== "react") return;
    const data = session.gameData as { armed: boolean; armedAt: number };
    if (!data.armed) {
      session.notify("لم تظهر الإشارة بعد — انتظر!").catch(() => null);
      return;
    }
    const ms = Date.now() - data.armedAt;
    const score = Math.max(0, 1000 - ms);
    session.finish({
      winners: [session.players[0].id],
      scores: { [session.players[0].id]: score },
      summary: `زمن رد فعلك: **${ms} مللي ثانية**.`
    });
  },

  render(session) {
    const data = session.gameData as { armed: boolean; armedAt: number };
    const embed = new EmbedBuilder()
      .setTitle("زمن رد الفعل")
      .setDescription(data.armed ? "**اضغط الآن!**" : "استعد...");
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`game:${session.id}:react`)
        .setLabel("اضغط")
        .setStyle(data.armed ? ButtonStyle.Danger : ButtonStyle.Secondary)
    );
    return { embeds: [embed], rows: [row] };
  }
};

export default def;