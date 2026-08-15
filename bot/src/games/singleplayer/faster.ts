import { EmbedBuilder, Message } from "discord.js";
import { GameDefinition, GameSession } from "../core/types";

const WORDS = [
  "سلام",
  "شمس",
  "بحر",
  "قمر",
  "ورد",
  "مدينة",
  "كتاب",
  "سحابة",
  "جبل",
  "نهر",
  "بيت",
  "حقل"
];

const ROUND_TIME = 8_000;

const def: GameDefinition<{ words: string[]; index: number; completed: number }> = {
  name: "faster",
  aliases: ["أسرع", "type"],
  title: "أسرع",
  description: "اكتب الكلمة قبل انتهاء الوقت — 5 كلمات متتالية.",
  instructions:
    "تظهر كلمة ويجب كتابتها في الشات خلال 8 ثوانٍ.\n" +
    "أكمل 5 كلمات صحيحة لتفوز.",
  category: "singleplayer",
  minPlayers: 1,
  maxPlayers: 1,
  durationLabel: "دقيقة تقريبًا",
  cooldownSeconds: 3,

  onStart(session) {
    session.gameData = {
      words: shuffle(WORDS).slice(0, 5),
      index: 0,
      completed: 0
    };
    session.phase = "playing";
    void runFaster(session);
  },

  onAction() {
    /* إجابات نصية */
  },

  render(session) {
    const data = session.gameData as { words: string[]; index: number; completed: number };
    const current = data.words[data.index];
    const embed = new EmbedBuilder()
      .setTitle("أسرع")
      .setDescription(
        current
          ? `اكتب هذه الكلمة: **${current}**\n(لديك 8 ثوانٍ)`
          : "انتهت الجولة."
      )
      .addFields({ name: "الكلمات المكتملة", value: `${data.completed}/5`, inline: true });
    return { embeds: [embed], rows: [] };
  }
};

async function runFaster(session: GameSession): Promise<void> {
  const data = session.gameData as { words: string[]; index: number; completed: number };

  for (let i = 0; i < data.words.length && session.status === "PLAYING"; i++) {
    data.index = i;
    await session.renderNow();

    const messages = await session.awaitText({
      time: ROUND_TIME,
      max: 1,
      filter: (m: Message) => m.author.id === session.players[0].id
    });
    if (session.status !== "PLAYING") return;

    if (!messages.length) {
      await session.notify("انتهى الوقت — لم تكتب الكلمة.").catch(() => null);
      const scores = { [session.players[0].id]: data.completed };
      await session.finish({ winners: [], scores, summary: `أكملت ${data.completed}/5 كلمات.` });
      return;
    }

    const answer = messages[0].content.trim().toLowerCase();
    if (answer === data.words[i].toLowerCase()) {
      data.completed += 1;
      await session.notify("إجابة صحيحة!").catch(() => null);
    } else {
      const scores = { [session.players[0].id]: data.completed };
      await session.finish({ winners: [], scores, summary: `إجابة خاطئة — أكملت ${data.completed}/5 كلمات.` });
      return;
    }
  }

  const scores = { [session.players[0].id]: data.completed };
  if (data.completed >= data.words.length) {
    await session.finish({ winners: [session.players[0].id], scores, summary: "أكملت كل الكلمات بسرعة!" });
  } else {
    await session.finish({ winners: [], scores, summary: `أكملت ${data.completed}/5 كلمات.` });
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