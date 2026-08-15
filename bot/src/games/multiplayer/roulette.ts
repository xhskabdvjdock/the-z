import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} from "discord.js";
import { GameDefinition, GameSession } from "../core/types";

function randChamber(chamberSize: number): number {
  return 1 + Math.floor(Math.random() * chamberSize);
}

const def: GameDefinition<{
  chamberSize: number;
  bulletPos: number;
  currentChamber: number;
}> = {
  name: "roulette",
  aliases: ["russian-roulette", "روليت-روسية", "rr"],
  title: "الروليت الروسية",
  description: "لعبة الحظ — أطلق النار على نفسك بالدور، ومن يصيبه الرصاص يخرج.",
  instructions:
    "مسدس بست خانات وبداخله رصاصة واحدة.\n" +
    "يتناوب اللاعبون على سحب الزناد ضد أنفسهم.\n" +
    "من تصل إليه الخانة المسدودة يخرج من اللعبة.\n" +
    "آخر لاعب باقٍ على قيد الحياة يفوز.",
  category: "multiplayer",
  minPlayers: 2,
  maxPlayers: 6,
  durationLabel: "دقائق قليلة",
  cooldownSeconds: 5,

  onStart(session) {
    session.gameData = { chamberSize: 6, bulletPos: randChamber(6), currentChamber: 1 };
    session.phase = "playing";
    session.round = 1;
    session.setTurn(session.players[0].id);
  },

  onAction(session, action) {
    if (action.type !== "fire") return;
    if (!session.isTurn(action.playerId)) return;

    const data = session.gameData;
    const shooter = session.getPlayer(action.playerId)!;

    if (data.currentChamber === data.bulletPos) {
      // رصاصة!
      shooter.alive = false;
      shooter.score = 1; // نجا جولة واحدة
      const alive = session.alivePlayers();
      session.notify(`رصاصة! <@${action.playerId}> خرج من اللعبة.`);

      if (alive.length <= 1) {
        const winner = alive[0];
        const scores: Record<string, number> = {};
        for (const p of session.players) scores[p.id] = p.alive ? 1 : 0;
        session.finish({
          winners: winner ? [winner.id] : [],
          scores,
          summary: winner
            ? `<@${winner.id}> هو الناجي الأخير في الروليت الروسية!`
            : "انتهت اللعبة بدون فائز."
        });
        return;
      }

      // إعادة تصويب المسدس للناجين
      data.bulletPos = randChamber(data.chamberSize);
      data.currentChamber = 1;
      session.round += 1;
      session.setTurn(alive[0].id);
    } else {
      // أمان — انتقل للاعب التالي
      data.currentChamber += 1;
      shooter.score += 1;
      const alive = session.alivePlayers();
      const idx = alive.findIndex((p) => p.id === action.playerId);
      session.setTurn(alive[(idx + 1) % alive.length].id);
    }
  },

  render(session) {
    const data = session.gameData;
    const alive = session.alivePlayers();
    const current = session.getPlayer(session.turnPlayerId ?? "");

    const embed = new EmbedBuilder()
      .setTitle("الروليت الروسية")
      .setDescription(
        `الناجون (${alive.length}):\n` +
          alive.map((p) => `<@${p.id}>`).join("، ") +
          "\n\n" +
          `الطلقة الحالية: ${data.currentChamber}/${data.chamberSize}\n` +
          `الجولة: ${session.round}\n` +
          (current ? `الدور: <@${current.id}>` : "")
      );

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`game:${session.id}:fire`)
        .setLabel("اسحب الزناد")
        .setStyle(ButtonStyle.Danger)
        .setDisabled(!session.isTurn(session.turnPlayerId ?? ""))
    );
    return { embeds: [embed], rows: [row] };
  }
};

export default def;