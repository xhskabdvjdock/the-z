import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} from "discord.js";
import { GameDefinition } from "../core/types";

function randCard(): number {
  return 2 + Math.floor(Math.random() * 12); // 2..13 (جاك، ملكة، ملك، آس)
}

function cardName(v: number): string {
  const names: Record<number, string> = {
    11: "J", 12: "Q", 13: "K", 14: "A"
  };
  return names[v] ?? String(v);
}

const def: GameDefinition<{
  currentCard: number;
  guesses: Record<string, "high" | "low">;
}> = {
  name: "highlow",
  aliases: ["high-low", "عال-أو-منخفض", "hl"],
  title: "عالٍ أم منخفض",
  description: "خمّن إذا كانت البطاقة التالية أعلى أو أقل — من يخطئ يخرج.",
  instructions:
    "تظهر بطاقة، ويخمّن كل ناجٍ هل البطاقة التالية أعلى أم أقل.\n" +
    "من يخمّن خطأً يخرج من اللعبة.\n" +
    "آخر لاعب باقٍ على قيد الحياة يفوز.",
  category: "multiplayer",
  minPlayers: 2,
  maxPlayers: 8,
  durationLabel: "دقائق قليلة",
  cooldownSeconds: 3,

  onStart(session) {
    session.gameData = { currentCard: randCard(), guesses: {} };
    session.phase = "playing";
    session.round = 1;
  },

  onAction(session, action) {
    if (action.type !== "guess") return;
    const data = session.gameData;
    const player = session.getPlayer(action.playerId);
    if (!player || !player.alive) return;
    if (data.guesses[action.playerId]) return;
    if (!["high", "low"].includes(action.value)) return;

    data.guesses[action.playerId] = action.value as "high" | "low";

    const alive = session.alivePlayers();
    if (Object.keys(data.guesses).length < alive.length) return;

    // حل الجولة
    const next = randCard();
    const survivors = alive.filter((p) => {
      const guess = data.guesses[p.id];
      if (next === data.currentCard) return false; // تعادل — لا أحد يصيب
      if (guess === "high") return next > data.currentCard;
      return next < data.currentCard;
    });

    session.notify(
      `البطاقة كانت **${cardName(next)}** (كانت **${cardName(data.currentCard)}**) — نجا: ${survivors.length}`
    );

    survivors.forEach((p) => (p.score += 1));
    alive.forEach((p) => {
      if (!survivors.find((s) => s.id === p.id)) p.alive = false;
    });

    if (survivors.length === 0) {
      const scores = Object.fromEntries(session.players.map((p) => [p.id, p.score]));
      session.finish({
        winners: [],
        draw: true,
        scores,
        summary: "الجميع خرج في نفس الجولة — تعادل."
      });
      return;
    }

    if (survivors.length === 1) {
      const w = survivors[0];
      session.finish({
        winners: [w.id],
        scores: Object.fromEntries(session.players.map((p) => [p.id, p.score])),
        summary: `<@${w.id}> هو آخر الناجين في عالٍ أم منخفض!`
      });
      return;
    }

    data.currentCard = next;
    data.guesses = {};
    session.round += 1;
  },

  render(session) {
    const data = session.gameData;
    const alive = session.alivePlayers();
    const myGuess = (id: string) => {
      const g = data.guesses[id];
      return g ? (g === "high" ? "عالٍ" : "منخفض") : "لم يخمّن";
    };

    const embed = new EmbedBuilder()
      .setTitle("عالٍ أم منخفض")
      .setDescription(
        `البطاقة الحالية: **${cardName(data.currentCard)}**\n\n` +
          alive.map((p) => `<@${p.id}>: ${myGuess(p.id)} (${p.score})`).join("\n") +
          `\n\nالناجون: ${alive.length}`
      );

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`game:${session.id}:guess:high`)
        .setLabel("أعلى")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`game:${session.id}:guess:low`)
        .setLabel("أقل")
        .setStyle(ButtonStyle.Danger)
    );
    return { embeds: [embed], rows: [row] };
  }
};

export default def;