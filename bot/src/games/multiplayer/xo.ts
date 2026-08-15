import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} from "discord.js";
import { GameDefinition, GameSession } from "../core/types";

const WIN_PATTERNS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6]
];

function boardText(session: GameSession): string {
  const b = session.gameData.board as string[];
  return (
    `**${b[0] || "·"} ${b[1] || "·"} ${b[2] || "·"}**\n` +
    `**${b[3] || "·"} ${b[4] || "·"} ${b[5] || "·"}**\n` +
    `**${b[6] || "·"} ${b[7] || "·"} ${b[8] || "·"}**`
  );
}

function checkWinner(board: string[]): string | null {
  for (const [a, b, c] of WIN_PATTERNS) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  }
  return null;
}

const def: GameDefinition<{ board: string[]; turnIndex: number }> = {
  name: "xo",
  aliases: ["tic-tac-toe", "x-o", "tic", "نقطة"],
  title: "XO (X O)",
  description: "لعبة إكس أو الكلاسيكية — املأ ثلاثة في صف قبل خصمك.",
  instructions:
    "يتناوب اللاعبان على وضع رمزيهما (X ثم O) في خانات الشبكة.\n" +
    "أول من يشكّل خطًا مستقيمًا (أفقي/عمودي/قطري) من 3 رموز يفوز.\n" +
    "انقر على الزر المناسب للعب دورك — كل لاعب يتحرك عند دوره فقط.",
  category: "multiplayer",
  minPlayers: 2,
  maxPlayers: 2,
  durationLabel: "دقيقة تقريبًا",
  cooldownSeconds: 3,

  onStart(session) {
    session.gameData = { board: Array(9).fill(null), turnIndex: 0 };
    session.phase = "playing";
    session.setTurn(session.players[0].id);
    session.round = 1;
  },

  onAction(session, action) {
    if (action.type !== "cell") return;
    if (!session.isTurn(action.playerId)) return;

    const data = session.gameData;
    const index = Number(action.value);
    if (Number.isNaN(index) || index < 0 || index > 8) return;
    if (data.board[index]) return;

    const piece = data.turnIndex === 0 ? "X" : "O";
    data.board[index] = piece;

    const winner = checkWinner(data.board);
    if (winner) {
      const winPlayer = data.turnIndex === 0 ? session.players[0] : session.players[1];
      session.finish({
        winners: [winPlayer.id],
        scores: {
          [session.players[0].id]: data.turnIndex === 0 ? 1 : 0,
          [session.players[1].id]: data.turnIndex === 1 ? 1 : 0
        },
        summary: `<@${winPlayer.id}> فاز بلعبة XO!`
      });
      return;
    }

    if (data.board.every(Boolean)) {
      session.finish({
        winners: [],
        draw: true,
        scores: { [session.players[0].id]: 0.5, [session.players[1].id]: 0.5 },
        summary: "تعادل في لعبة XO."
      });
      return;
    }

    data.turnIndex = data.turnIndex === 0 ? 1 : 0;
    session.setTurn(session.players[data.turnIndex].id);
  },

  render(session) {
    const data = session.gameData;
    const current = session.getPlayer(session.turnPlayerId ?? "");
    const embed = new EmbedBuilder()
      .setTitle("XO (X O)")
      .setDescription(boardText(session))
      .addFields(
        { name: "X", value: `<@${session.players[0]?.id ?? "—"}>`, inline: true },
        { name: "O", value: `<@${session.players[1]?.id ?? "—"}>`, inline: true },
        { name: "الدور", value: current ? `<@${current.id}>` : "—", inline: true }
      );

    const rows: ActionRowBuilder<ButtonBuilder>[] = [];
    for (let r = 0; r < 3; r++) {
      const row = new ActionRowBuilder<ButtonBuilder>();
      for (let c = 0; c < 3; c++) {
        const i = r * 3 + c;
        const v = data.board[i];
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`game:${session.id}:cell:${i}`)
            .setLabel(v || "·")
            .setStyle(v === "X" ? ButtonStyle.Danger : v === "O" ? ButtonStyle.Success : ButtonStyle.Secondary)
            .setDisabled(!!v || !session.isTurn(session.turnPlayerId ?? ""))
        );
      }
      rows.push(row);
    }
    return { embeds: [embed], rows };
  }
};

export default def;