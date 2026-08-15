import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} from "discord.js";
import { GameDefinition } from "../core/types";

const GOAL = 25;
const TIME = 20_000;

const def: GameDefinition<{ clicks: number; goal: number }> = {
  name: "button",
  aliases: ["زر", "click"],
  title: "الزر",
  description: "اضغط الزر 25 مرة قبل انتهاء الوقت.",
  instructions:
    "لديك 20 ثانية.\n" +
    "اضغط الزر 25 مرة لتفوز.\n" +
    "لو انتهى الوقت قبل ذلك تخسر.",
  category: "singleplayer",
  minPlayers: 1,
  maxPlayers: 1,
  durationLabel: "20 ثانية",
  cooldownSeconds: 3,

  onStart(session) {
    session.gameData = { clicks: 0, goal: GOAL };
    session.phase = "playing";
    session.setTimer("end", TIME, () => {
      if (session.status !== "PLAYING") return;
      const data = session.gameData as { clicks: number; goal: number };
      const scores = { [session.players[0].id]: data.clicks };
      if (data.clicks >= data.goal) {
        session.finish({ winners: [session.players[0].id], scores, summary: `وصلت إلى ${data.clicks} نقرة!` });
      } else {
        session.finish({ winners: [], scores, summary: `انتهى الوقت عند ${data.clicks}/${data.goal} نقرة.` });
      }
    });
  },

  onAction(session, action) {
    if (action.type !== "click") return;
    const data = session.gameData as { clicks: number; goal: number };
    data.clicks += 1;
    if (data.clicks >= data.goal) {
      session.clearTimer("end");
      session.finish({
        winners: [session.players[0].id],
        scores: { [session.players[0].id]: data.clicks },
        summary: `أنهيت ${data.clicks} نقرة قبل انتهاء الوقت!`
      });
    }
  },

  render(session) {
    const data = session.gameData as { clicks: number; goal: number };
    const embed = new EmbedBuilder()
      .setTitle("الزر")
      .setDescription(`النقرات: **${data.clicks}/${data.goal}**\nالوقت المتبقي: 20 ثانية`);
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`game:${session.id}:click`)
        .setLabel(`اضغط (${data.clicks})`)
        .setStyle(ButtonStyle.Primary)
    );
    return { embeds: [embed], rows: [row] };
  }
};

export default def;