import { EmbedBuilder, Message } from "discord.js";
import { GameDefinition, GameSession } from "../core/types";

const WORDS = [
  "كرة", "بيت", "قمر", "شمس", "باب", "قلب",
  "بحر", "طين", "خبر", "ورد", "نهر", "سهم",
  "مفتاح", "ساعة", "قلم", "نجمة"
];

const ROUNDS = 8;

const def: GameDefinition<{ words: string[]; index: number; completed: number }> = {
  name: "morefaster",
  aliases: ["أسرع-وأسرع", "turbo"],
  title: "أسرع وأسرع",
  description: "اكتب الكلمات بوتيرة متصاعدة — كلما تقدمت قلّ الوقت.",
  instructions:
    "تظهر كلمة يجب كتابتها بسرعة.\n" +
    "الوقت يتقلص مع كل جولة (10 ثم 8 ثم 6 ... ثوانٍ).\n" +
    "أكمل كل الجولات لتفوز.",
  category: "singleplayer",
  minPlayers: 1,
  maxPlayers: 1,
  durationLabel: "دقيقة تقريبًا",
  cooldownSeconds: 3,

  onStart(session) {
    session.gameData = {
      words: shuffle(WORDS).slice(0, ROUNDS),
      index: 0,
      completed: 0
    };
    session.phase = "playing";
    void runTurbo(session);
  },

  onAction() {
    /* إجابات نصية */
  },

  render(session) {
    const data = session.gameData as { words: string[]; index: number; completed: number };
    const current = data.words[data.index];
    const time = 10 - data.index;
    const embed = new EmbedBuilder()
      .setTitle("أسرع وأسرع")
      .setDescription(
        current
          ? `اكتب: **${current}**\n(لديك ${time} ثوانٍ)`
          : "انتهت الجولة."
      )
      .addFields({ name: "المكتملة", value: `${data.completed}/${ROUNDS}`, inline: true });
    return { embeds: [embed], rows: [] };
  }
};

async function runTurbo(session: GameSession): Promise<void> {
  const data = session.gameData as { words: string[]; index: number; completed: number };

  for (let i = 0; i < data.words.length && session.status === "PLAYING"; i++) {
    data.index = i;
    const time = Math.max(3, 10 - i) * 1000;
    await session.renderNow();

    const messages = await session.awaitText({
      time,
      max: 1,
      filter: (m: Message) => m.author.id === session.players[0].id
    });
    if (session.status !== "PLAYING") return;

    if (!messages.length) {
      await session.finish({ winners: [], scores: { [session.players[0].id]: data.completed }, summary: `انتهى الوقت — أكملت ${data.completed}/${ROUNDS}.` });
      return;
    }

    if (messages[0].content.trim().toLowerCase() === data.words[i]) {
      data.completed += 1;
      await session.notify("صحيح!").catch(() => null);
    } else {
      await session.finish({ winners: [], scores: { [session.players[0].id]: data.completed }, summary: `الكلمة كانت **${data.words[i]}** — أكملت ${data.completed}/${ROUNDS}.` });
      return;
    }
  }

  if (data.completed >= data.words.length) {
    await session.finish({ winners: [session.players[0].id], scores: { [session.players[0].id]: data.completed }, summary: "أنهيت كل الجولات بوتيرة فائقة!" });
  }
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