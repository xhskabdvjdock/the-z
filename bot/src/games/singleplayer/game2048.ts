import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} from "discord.js";
import { GameDefinition } from "../core/types";

const SIZE = 4;

type Grid = number[][];

function emptyGrid(): Grid {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
}

function spawn(grid: Grid): void {
  const empty: [number, number][] = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (grid[r][c] === 0) empty.push([r, c]);
    }
  }
  if (!empty.length) return;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  grid[r][c] = Math.random() < 0.9 ? 2 : 4;
}

/** دفع خط نحو الأمام مع الدمج — كل خلية تندمج مرة واحدة */
function slideLine(line: number[]): { line: number[]; gain: number } {
  const vals = line.filter((v) => v !== 0);
  const out: number[] = [];
  let gain = 0;
  for (let i = 0; i < vals.length; i++) {
    if (i + 1 < vals.length && vals[i] === vals[i + 1]) {
      out.push(vals[i] * 2);
      gain += vals[i] * 2;
      i++;
    } else {
      out.push(vals[i]);
    }
  }
  while (out.length < SIZE) out.push(0);
  return { line: out, gain };
}

function applyMove(grid: Grid, dir: "up" | "down" | "left" | "right"): { gain: number; changed: boolean } {
  const copy: Grid = grid.map((r) => [...r]);
  let gain = 0;

  const getLine = (i: number): number[] => {
    if (dir === "left") return copy[i];
    if (dir === "right") return [...copy[i]].reverse();
    const col = copy.map((r) => r[i]);
    if (dir === "up") return col;
    return [...col].reverse();
  };
  const setLine = (i: number, line: number[]): void => {
    if (dir === "left") {
      copy[i] = line;
    } else if (dir === "right") {
      copy[i] = [...line].reverse();
    } else if (dir === "up") {
      for (let r = 0; r < SIZE; r++) copy[r][i] = line[r];
    } else {
      for (let r = 0; r < SIZE; r++) copy[r][i] = [...line].reverse()[r];
    }
  };

  for (let i = 0; i < SIZE; i++) {
    const { line, gain: g } = slideLine(getLine(i));
    setLine(i, line);
    gain += g;
  }

  const changed = JSON.stringify(copy) !== JSON.stringify(grid);
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) grid[r][c] = copy[r][c];
  return { gain, changed };
}

function renderGrid(grid: Grid): string {
  return grid.map((row) => row.map((v) => (v === 0 ? "·" : String(v))).join(" ")).join("\n");
}

function canMove(grid: Grid): boolean {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (grid[r][c] === 0) return true;
      if (c + 1 < SIZE && grid[r][c] === grid[r][c + 1]) return true;
      if (r + 1 < SIZE && grid[r][c] === grid[r + 1][c]) return true;
    }
  }
  return false;
}

const def: GameDefinition<{ grid: Grid; score: number }> = {
  name: "game2048",
  aliases: ["2048", "عشرون-أربعون"],
  title: "2048",
  description: "ادمج الأرقام المتطابقة حتى تصل إلى 2048.",
  instructions:
    "حرك اللوحة بالأزرار (فوق/تحت/يمين/يسار).\n" +
    "الأرقام المتطابقة تندمج وتضاعف نتيجتك.\n" +
    "صل إلى 2048 لتفوز — لو امتلأت اللوحة دون حركة تخسر.",
  category: "singleplayer",
  minPlayers: 1,
  maxPlayers: 1,
  durationLabel: "5 دقائق تقريبًا",
  cooldownSeconds: 3,

  onStart(session) {
    const grid = emptyGrid();
    spawn(grid);
    spawn(grid);
    session.gameData = { grid, score: 0 };
    session.phase = "playing";
  },

  onAction(session, action) {
    if (action.type !== "move") return;
    const data = session.gameData as { grid: Grid; score: number };
    const dir = action.value as "up" | "down" | "left" | "right";
    const { gain, changed } = applyMove(data.grid, dir);
    if (!changed) {
      session.notify("لا حركة ممكنة في هذا الاتجاه.").catch(() => null);
      return;
    }
    data.score += gain;
    spawn(data.grid);

    // فوز
    for (const row of data.grid) {
      if (row.includes(2048)) {
        session.finish({
          winners: [session.players[0].id],
          scores: { [session.players[0].id]: data.score },
          summary: `وصلت إلى 2048! نتيجتك: ${data.score}`
        });
        return;
      }
    }

    // خسارة
    if (!canMove(data.grid)) {
      session.finish({
        winners: [],
        scores: { [session.players[0].id]: data.score },
        summary: `امتلأت اللوحة — نتيجتك: ${data.score}`
      });
    }
  },

  render(session) {
    const data = session.gameData as { grid: Grid; score: number };
    const embed = new EmbedBuilder()
      .setTitle("2048")
      .setDescription(`**${renderGrid(data.grid)}**\n\nالنتيجة: ${data.score}`);

    const up = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`game:${session.id}:move:up`).setLabel("فوق").setStyle(ButtonStyle.Primary)
    );
    const mid = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`game:${session.id}:move:left`).setLabel("يسار").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`game:${session.id}:move:down`).setLabel("تحت").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`game:${session.id}:move:right`).setLabel("يمين").setStyle(ButtonStyle.Secondary)
    );
    return { embeds: [embed], rows: [up, mid] };
  }
};

export default def;