import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} from "discord.js";
import { GameDefinition, GameSession } from "../core/types";

const BEATS: Record<string, string> = { rock: "scissors", paper: "rock", scissors: "paper" };
const LABELS: Record<string, string> = { rock: "حجر", paper: "ورقة", scissors: "مقص" };

const def: GameDefinition<{ choices: Record<string, string>; winnerScore: number }> = {
  name: "rps",
  aliases: ["rock-paper-scissors", "حجر-ورقة-مقص", "hjs"],
  title: "حجر ورقة مقص",
  description: "منافسة سريعة — أول من يفوز بثلاث جولات.",
  instructions:
    "يختار كل لاعب سرًا حجر أو ورقة أو مقص بالضغط على الزر.\n" +
    "تُكشف الخيارات معًا وتُحتسب الجولة: الحجر يكسر المقص، الورقة تغطي الحجر، المقص يقطع الورقة.\n" +
    "أول من يصل إلى 3 انتصارات يفوز باللعبة.",
  category: "multiplayer",
  minPlayers: 2,
  maxPlayers: 2,
  durationLabel: "دقيقتان تقريبًا",
  cooldownSeconds: 3,

  onStart(session) {
    session.gameData = { choices: {}, winnerScore: 3 };
    session.phase = "playing";
    session.round = 1;
  },

  onAction(session, action) {
    if (action.type !== "choice") return;
    const data = session.gameData;
    if (data.choices[action.playerId]) return;
    if (!["rock", "paper", "scissors"].includes(action.value)) return;

    data.choices[action.playerId] = action.value;

    // كل اللاعبين اختاروا؟
    if (Object.keys(data.choices).length < session.players.length) return;

    const [a, b] = session.players;
    const ca = data.choices[a.id];
    const cb = data.choices[b.id];

    let winnerId: string | null = null;
    if (BEATS[ca] === cb) winnerId = a.id;
    else if (BEATS[cb] === ca) winnerId = b.id;

    if (winnerId) {
      const winner = session.getPlayer(winnerId)!;
      winner.score += 1;
      session.round += 1;
      session.notify(
        `${LABELS[ca]} ضد ${LABELS[cb]} — فاز بالجولة: <@${winnerId}>`
      );
    } else {
      session.round += 1;
      session.notify(`${LABELS[ca]} ضد ${LABELS[cb]} — تعادل!`);
    }

    data.choices = {};

    // من وصل أولًا لثلاث انتصارات؟
    if (a.score >= data.winnerScore || b.score >= data.winnerScore) {
      const leader = a.score >= data.winnerScore ? a : b;
      session.finish({
        winners: [leader.id],
        scores: { [a.id]: a.score, [b.id]: b.score },
        summary: `<@${leader.id}> فاز في حجر ورقة مقص بنتيجة ${leader.score} - ${
          leader.id === a.id ? b.score : a.score
        }`
      });
    }
  },

  render(session) {
    const data = session.gameData;
    const [a, b] = session.players;
    const chosen = (id: string) => (data.choices[id] ? LABELS[data.choices[id]] : "لم يختر بعد");

    const embed = new EmbedBuilder()
      .setTitle("حجر ورقة مقص")
      .setDescription(
        `الجولة ${session.round}\n\n` +
          `<@${a.id}>: **${a.score}** نقطة — ${chosen(a.id)}\n` +
          `<@${b.id}>: **${b.score}** نقطة — ${chosen(b.id)}\n\n` +
          `الهدف: أول من يصل **${data.winnerScore}**`
      );

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`game:${session.id}:choice:rock`)
        .setLabel("حجر")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`game:${session.id}:choice:paper`)
        .setLabel("ورقة")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`game:${session.id}:choice:scissors`)
        .setLabel("مقص")
        .setStyle(ButtonStyle.Success)
    );
    return { embeds: [embed], rows: [row] };
  }
};

export default def;