import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} from "discord.js";
import { GameDefinition } from "../core/types";

const SIZE = 4;
const PAIRS = (SIZE * SIZE) / 2;

interface Card {
  value: number;
  revealed: boolean;
}

function buildCards(): Card[] {
  const values: number[] = [];
  for (let i = 0; i < PAIRS; i++) values.push(i, i);
  for (let i = values.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }
  return values.map((v) => ({ value: v, revealed: false }));
}

const def: GameDefinition<{ cards: Card[]; first: number | null; moves: number; pending: boolean }> = {
  name: "memory",
  aliases: ["ذاكرة", "pairs"],
  title: "الذاكرة",
  description: "قلّب البطاقات وطابق الأزواج في أقل عدد حركات.",
  instructions:
    "4x4 بطاقات مقلوبة — 8 أزواج.\n" +
    "اقلب بطاقتين؛ إذا تطابقتا تبقى مكشوفتين.\n" +
    "أكمل كل الأزواج لتفوز. عدد أقل من الحركات = نتيجة أفضل.",
  category: "singleplayer",
  minPlayers: 1,
  maxPlayers: 1,
  durationLabel: "دقيقتان تقريبًا",
  cooldownSeconds: 3,

  onStart(session) {
    session.gameData = { cards: buildCards(), first: null, moves: 0, pending: false };
    session.phase = "playing";
  },

  async onAction(session, action) {
    if (action.type !== "flip") return;
    const data = session.gameData as { cards: Card[]; first: number | null; moves: number; pending: boolean };
    if (data.pending) return;

    const idx = Number(action.value);
    if (Number.isNaN(idx) || idx < 0 || idx >= data.cards.length) return;
    const card = data.cards[idx];
    if (card.revealed) return;

    data.moves += 1;
    card.revealed = true;

    if (data.first == null) {
      data.first = idx;
      return;
    }

    const first = data.first;
    data.first = null;

    if (data.cards[first].value === card.value) {
      // تطابق
      if (data.cards.every((c) => c.revealed)) {
        const score = Math.max(0, 60 - data.moves);
        await session.finish({
          winners: [session.players[0].id],
          scores: { [session.players[0].id]: score },
          summary: `طابقت كل الأزواج في ${data.moves} حركة!`
        });
      }
      return;
    }

    // لا تطابق — أظهرهما ثم أعد قلبهما بعد لحظة
    data.pending = true;
    await session.renderNow();
    await session.wait(1200);
    if (session.status !== "PLAYING") return;
    data.cards[first].revealed = false;
    card.revealed = false;
    data.pending = false;
  },

  render(session) {
    const data = session.gameData as { cards: Card[]; first: number | null; moves: number; pending: boolean };
    const grid: string[] = [];
    for (let r = 0; r < SIZE; r++) {
      const row: string[] = [];
      for (let c = 0; c < SIZE; c++) {
        const card = data.cards[r * SIZE + c];
        row.push(card.revealed ? String(card.value + 1) : "؟");
      }
      grid.push(row.join(" "));
    }

    const embed = new EmbedBuilder()
      .setTitle("الذاكرة")
      .setDescription(`**${grid.join("\n")}**\n\nالحركات: ${data.moves}`);

    const rows: ActionRowBuilder<ButtonBuilder>[] = [];
    for (let r = 0; r < SIZE; r++) {
      const row = new ActionRowBuilder<ButtonBuilder>();
      for (let c = 0; c < SIZE; c++) {
        const idx = r * SIZE + c;
        const card = data.cards[idx];
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`game:${session.id}:flip:${idx}`)
            .setLabel(card.revealed ? String(card.value + 1) : "؟")
            .setStyle(card.revealed ? ButtonStyle.Success : ButtonStyle.Secondary)
            .setDisabled(card.revealed || data.pending)
        );
      }
      rows.push(row);
    }
    return { embeds: [embed], rows };
  }
};

export default def;