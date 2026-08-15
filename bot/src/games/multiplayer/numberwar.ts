import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} from "discord.js";
import { GameDefinition } from "../core/types";

const WIN_SCORE = 5;

const def: GameDefinition<{ rolled: Record<string, number>; target: number }> = {
  name: "numberwar",
  aliases: ["number-war", "حرب-الأرقام", "nw"],
  title: "حرب الأرقام",
  description: "اسحب رقمًا — أعلى رقم يفوز بالجولة. أول من يحصد 5 انتصارات.",
  instructions:
    "في كل جولة يسحب كل لاعب رقمًا عشوائيًا بالضغط على الزر.\n" +
    "اللاعب صاحب أعلى رقم يكسب الجولة.\n" +
    "أول من يصل إلى 5 جولات يفوز.",
  category: "multiplayer",
  minPlayers: 2,
  maxPlayers: 8,
  durationLabel: "دقائق قليلة",
  cooldownSeconds: 3,

  onStart(session) {
    session.gameData = { rolled: {}, target: WIN_SCORE };
    session.phase = "playing";
    session.round = 1;
  },

  onAction(session, action) {
    if (action.type !== "roll") return;
    const data = session.gameData as { rolled: Record<string, number>; target: number };
    if (data.rolled[action.playerId] != null) return; // سحب مرة واحدة بالجولة

    data.rolled[action.playerId] = 1 + Math.floor(Math.random() * 100);

    if (Object.keys(data.rolled).length < session.players.length) return;

    // كل اللاعبين سحبوا — احسب الفائز
    let best: { id: string; value: number } | null = null;
    for (const [id, v] of Object.entries(data.rolled) as [string, number][]) {
      if (!best || v > best.value) best = { id, value: v };
    }

    const winner = best ? session.getPlayer(best.id) : null;
    const ties = best
      ? session.players.filter((p) => data.rolled[p.id] === best.value)
      : [];

    if (winner && ties.length === 1 && best) {
      winner.score += 1;
      session.round += 1;
      session.notify(
        `<@${best.id}> سحب **${best.value}** وفاز بالجولة — النتيجة: ${scoresText(session)}`
      );
      if (winner.score >= data.target) {
        session.finish({
          winners: [winner.id],
          scores: Object.fromEntries(session.players.map((p) => [p.id, p.score])),
          summary: `<@${winner.id}> فاز في حرب الأرقام (${winner.score} جولات).`
        });
        return;
      }
    } else {
      session.round += 1;
      session.notify(
        `تعادل في الجولة: ${ties.map((t) => `<@${t.id}>`).join("، ")} سحبوا **${best?.value}**`
      );
    }

    data.rolled = {};
  },

  render(session) {
    const data = session.gameData;
    const embed = new EmbedBuilder()
      .setTitle("حرب الأرقام")
      .setDescription(
        `الجولة ${session.round}\n\n` +
          session.players
            .map((p) => {
              const r = data.rolled[p.id];
              return `<@${p.id}>: **${r != null ? r : "لم يسحب بعد"}** (${p.score})`;
            })
            .join("\n") +
          `\n\nالهدف: أول من يصل ${data.target}`
      );

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`game:${session.id}:roll`)
        .setLabel("اسحب رقمًا")
        .setStyle(ButtonStyle.Primary)
    );
    return { embeds: [embed], rows: [row] };
  }
};

function scoresText(session: any): string {
  return session.players.map((p: any) => `<@${p.id}>: ${p.score}`).join(" — ");
}

export default def;