import { EmbedBuilder, Message } from "discord.js";
import { GameDefinition, GameSession } from "../core/types";

const WORDS = [
  "منزل", "سحاب", "نجمة", "مفتاح", "ساعة",
  "مدرسة", "حديقة", "قبعة", "نافذة", "طاولة",
  "قمر", "وردة", "كتاب", "شجرة", "بحر"
];

const TOTAL = 8;

const def: GameDefinition<{ words: string[]; index: number; completed: number }> = {
  name: "scramble",
  aliases: ["فك-الترميز", "unscramble"],
  title: "فك الترميز",
  description: "رتب الحروف المبعثرة لتكوّن الكلمة الصحيحة — 8 كلمات.",
  instructions:
    "تظهر كلمة بحروف مبعثرة.\n" +
    "اكتب الكلمة الصحيحة في الشات خلال 15 ثانية.\n" +
    "أكمل 8 كلمات لتفوز.",
  category: "singleplayer",
  minPlayers: 1,
  maxPlayers: 1,
  durationLabel: "دقيقتان تقريبًا",
  cooldownSeconds: 3,

  onStart(session) {
    session.gameData = {
      words: shuffle(WORDS).slice(0, TOTAL),
      index: 0,
      completed: 0
    };
    session.phase = "playing";
    void runScramble(session);
  },

  onAction() {
    /* إجابات نصية */
  },

  render(session) {
    const data = session.gameData as { words: string[]; index: number; completed: number };
    const current = data.words[data.index];
    const embed = new EmbedBuilder()
      .setTitle("فك الترميز")
      .setDescription(
        current
          ? `فك هذه الكلمة: **${shuffleWord(current)}**`
          : "انتهت الكلمات."
      )
      .addFields({ name: "المكتملة", value: `${data.completed}/${TOTAL}`, inline: true });
    return { embeds: [embed], rows: [] };
  }
};

async function runScramble(session: GameSession): Promise<void> {
  const data = session.gameData as { words: string[]; index: number; completed: number };

  for (let i = 0; i < data.words.length && session.status === "PLAYING"; i++) {
    data.index = i;
    await session.renderNow();

    const messages = await session.awaitText({
      time: 15_000,
      max: 1,
      filter: (m: Message) => m.author.id === session.players[0].id
    });
    if (session.status !== "PLAYING") return;

    if (!messages.length) {
      await session.finish({ winners: [], scores: { [session.players[0].id]: data.completed }, summary: `انتهى الوقت — أكملت ${data.completed}/${TOTAL}.` });
      return;
    }

    if (messages[0].content.trim() === data.words[i]) {
      data.completed += 1;
      await session.notify("صحيح!").catch(() => null);
    } else {
      await session.finish({ winners: [], scores: { [session.players[0].id]: data.completed }, summary: `الكلمة كانت **${data.words[i]}** — أكملت ${data.completed}/${TOTAL}.` });
      return;
    }
  }

  if (data.completed >= data.words.length) {
    await session.finish({ winners: [session.players[0].id], scores: { [session.players[0].id]: data.completed }, summary: "فككت كل الكلمات!" });
  }
}

function shuffleWord(word: string): string {
  const letters = word.split("");
  for (let i = letters.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [letters[i], letters[j]] = [letters[j], letters[i]];
  }
  return letters.join("");
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default def;