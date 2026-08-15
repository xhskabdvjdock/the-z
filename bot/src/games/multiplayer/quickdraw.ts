import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} from "discord.js";
import { GameDefinition } from "../core/types";

const WIN_SCORE = 5;
const READY_MIN = 2500;
const READY_MAX = 6000;

const def: GameDefinition<{ go: boolean; roundWinner: string | null }> = {
  name: "quickdraw",
  aliases: ["quick-draw", "draw", "الرد-السريع", "نفَس"],
  title: "الرد السريع",
  description: "أسرع يد على الزناد تفوز بالجولة — أول من يحصد 5 انتصارات.",
  instructions:
    "ستظهر رسالة استعداد ثم تظهر إشارة (اضغط الآن).\n" +
    "أول لاعب يضغط الزر بعد الإشارة يكسب الجولة.\n" +
    "الضغط قبل الإشارة لا يُحتسب.\n" +
    "أول من يصل إلى 5 جولات يفوز.",
  category: "multiplayer",
  minPlayers: 2,
  maxPlayers: 8,
  durationLabel: "دقائق قليلة",
  cooldownSeconds: 3,

  onStart(session) {
    session.gameData = { go: false, roundWinner: null };
    session.phase = "playing";
    session.round = 1;
    scheduleGo(session);
  },

  onAction(session, action) {
    if (action.type !== "draw") return;
    const data = session.gameData;
    if (!data.go) return; // ضغط قبل الإشارة

    const player = session.getPlayer(action.playerId)!;
    if (data.roundWinner) return; // الجولة انتهت بالفعل

    data.roundWinner = action.playerId;
    player.score += 1;
    session.round += 1;

    if (player.score >= WIN_SCORE) {
      session.finish({
        winners: [player.id],
        scores: Object.fromEntries(session.players.map((p) => [p.id, p.score])),
        summary: `<@${player.id}> فاز في الرد السريع (${player.score} انتصارات).`
      });
      return;
    }

    session.notify(`جولة للاعب <@${action.playerId}> — النتيجة: ${scoresText(session)}`);
    data.go = false;
    data.roundWinner = null;
    session.clearTimer("go");
    scheduleGo(session);
  },

  render(session) {
    const data = session.gameData;
    const embed = new EmbedBuilder()
      .setTitle("الرد السريع")
      .setDescription(
        data.go
          ? "**اضغط الآن!**"
          : "استعد... الإشارة ستظهر فجأة."
      )
      .addFields({ name: "الجولة", value: `${session.round}`, inline: true })
      .addFields({
        name: "النتيجة",
        value: scoresText(session),
        inline: false
      });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`game:${session.id}:draw`)
        .setLabel("اضغط")
        .setStyle(data.go ? ButtonStyle.Danger : ButtonStyle.Secondary)
    );
    return { embeds: [embed], rows: [row] };
  }
};

function scoresText(session: any): string {
  return session.players
    .map((p: any) => `<@${p.id}>: ${p.score}`)
    .join(" — ");
}

function scheduleGo(session: any): void {
  const delay = READY_MIN + Math.floor(Math.random() * (READY_MAX - READY_MIN));
  session.setTimer("go", delay, () => {
    if (session.status !== "PLAYING") return;
    session.gameData.go = true;
    session.renderNow().catch(() => null);
  });
}

export default def;