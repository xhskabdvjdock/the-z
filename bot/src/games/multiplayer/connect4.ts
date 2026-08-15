import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} from "discord.js";
import { GameDefinition, GameSession } from "../core/types";

const ROWS = 6;
const COLS = 7;

type Grid = (null | "X" | "O")[][];

function emptyGrid(): Grid {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function renderBoard(grid: Grid): string {
  const lines: string[] = [];
  for (let r = ROWS - 1; r >= 0; r--) {
    lines.push(grid[r].map((c) => c ?? "·").join(" "));
  }
  return lines.map((l) => `**${l}**`).join("\n");
}

function drop(grid: Grid, col: number, piece: "X" | "O"): number | null {
  for (let r = 0; r < ROWS; r++) {
    if (!grid[r][col]) {
      grid[r][col] = piece;
      return r;
    }
  }
  return null;
}

function checkWin(grid: Grid, row: number, col: number): boolean {
  const piece = grid[row][col];
  if (!piece) return false;
  const dirs = [
    [1, 0], [0, 1], [1, 1], [1, -1]
  ];
  for (const [dr, dc] of dirs) {
    let count = 1;
    for (let s = 1; s < 4; s++) {
      const r = row + dr * s;
      const c = col + dc * s;
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS) break;
      if (grid[r][c] === piece) count++;
      else break;
    }
    for (let s = 1; s < 4; s++) {
      const r = row - dr * s;
      const c = col - dc * s;
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS) break;
      if (grid[r][c] === piece) count++;
      else break;
    }
    if (count >= 4) return true;
  }
  return false;
}

const def: GameDefinition<{ grid: Grid; turnIndex: number }> = {
  name: "connect4",
  aliases: ["connect-4", "c4", "أربعة-في-صف"],
  title: "أربعة في صف",
  description: "أسقط القطع واربط أربعة في صف قبل خصمك.",
  instructions:
    "يتناوب اللاعبان على اختيار عمود لإسقاط قطعتهما.\n" +
    "أول من يربط 4 قطع أفقية/عمودية/قطرية يفوز.\n" +
    "العمود الممتلئ لا يقبل المزيد.",
  category: "multiplayer",
  minPlayers: 2,
  maxPlayers: 2,
  durationLabel: "3-5 دقائق",
  cooldownSeconds: 3,

  onStart(session) {
    session.gameData = { grid: emptyGrid(), turnIndex: 0 };
    session.phase = "playing";
    session.setTurn(session.players[0].id);
    session.round = 1;
  },

  onAction(session, action) {
    if (action.type !== "col") return;
    if (!session.isTurn(action.playerId)) return;

    const data = session.gameData as { grid: Grid; turnIndex: number };
    const col = Number(action.value);
    if (Number.isNaN(col) || col < 0 || col >= COLS) return;

    const piece = data.turnIndex === 0 ? "X" : "O";
    const row = drop(data.grid, col, piece);
    if (row == null) return;

    const currentPlayer = session.players[data.turnIndex];

    if (checkWin(data.grid, row, col)) {
      session.finish({
        winners: [currentPlayer.id],
        scores: {
          [session.players[0].id]: data.turnIndex === 0 ? 1 : 0,
          [session.players[1].id]: data.turnIndex === 1 ? 1 : 0
        },
        summary: `<@${currentPlayer.id}> ربط أربعة في صف وفاز!`
      });
      return;
    }

    if (data.grid.every((r) => r.every(Boolean))) {
      session.finish({
        winners: [],
        draw: true,
        scores: { [session.players[0].id]: 0.5, [session.players[1].id]: 0.5 },
        summary: "امتلأت اللوحة — تعادل."
      });
      return;
    }

    data.turnIndex = data.turnIndex === 0 ? 1 : 0;
    session.setTurn(session.players[data.turnIndex].id);
  },

  render(session) {
    const data = session.gameData as { grid: Grid; turnIndex: number };
    const current = session.getPlayer(session.turnPlayerId ?? "");
    const embed = new EmbedBuilder()
      .setTitle("أربعة في صف")
      .setDescription(renderBoard(data.grid))
      .addFields(
        { name: "X", value: `<@${session.players[0]?.id ?? "—"}>`, inline: true },
        { name: "O", value: `<@${session.players[1]?.id ?? "—"}>`, inline: true },
        { name: "الدور", value: current ? `<@${current.id}>` : "—", inline: true }
      );

    const row = new ActionRowBuilder<ButtonBuilder>();
    for (let c = 0; c < COLS; c++) {
      const full = data.grid[ROWS - 1][c] != null;
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`game:${session.id}:col:${c}`)
          .setLabel(String(c + 1))
          .setStyle(ButtonStyle.Primary)
          .setDisabled(full || !session.isTurn(session.turnPlayerId ?? ""))
      );
    }
    return { embeds: [embed], rows: [row] };
  }
};

export default def;