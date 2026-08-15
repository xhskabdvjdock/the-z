import { EmbedBuilder, Message } from "discord.js";
import { GameDefinition, GameSession } from "../core/types";

const MAX_WRONG = 6;
const ROUND_TIME = 30_000;

function display(word: string, guessed: Set<string>): string {
  return word
    .split("")
    .map((ch) => (guessed.has(ch) ? ch : "_"))
    .join(" ");
}

const def: GameDefinition<{
  word: string;
  guessed: Set<string>;
  wrong: number;
  maxWrong: number;
}> = {
  name: "hangman",
  aliases: ["حبل-الغسيل", "hm"],
  title: "حبل الغسيل",
  description: "خمّن كلمة المضيف حرفًا حرفًا قبل أن يكتمل حبل الغسيل.",
  instructions:
    "المضيف يحدد كلمة سرية، وبقية اللاعبين يخمّنونها.\n" +
    "اكتب حرفًا في الشات ليكشف عنه، أو اكتب الكلمة كاملة للحسم الفوري.\n" +
    "ستة أخطاء = خسارة (يفوز المضيف).\n" +
    "كشف الكلمة كاملة = فوز المخمّنين.",
  category: "multiplayer",
  minPlayers: 2,
  maxPlayers: 6,
  durationLabel: "دقيقتان تقريبًا",
  cooldownSeconds: 3,

  async parseArgs(args, session) {
    const word = (args.join("") || "").toLowerCase().replace(/[^a-z\u0600-\u06FF]/g, "");
    if (word.length < 3 || word.length > 20) {
      return "يجب تحديد كلمة سرية (3 إلى 20 حرفًا): مثل `-hangman سرّ`";
    }
    session.gameData = {
      word,
      guessed: new Set(),
      wrong: 0,
      maxWrong: MAX_WRONG
    };
    return null;
  },

  async onStart(session) {
    session.phase = "playing";
    await session.renderNow();
    await runHangman(session);
  },

  onAction() {
    /* الإجابات نصية — لا أزرار */
  },

  render(session) {
    const data = session.gameData;
    const embed = new EmbedBuilder()
      .setTitle("حبل الغسيل")
      .setDescription(
        `**الكلمة:**\n${display(data.word, data.guessed)}\n\n` +
          `الأخطاء: ${data.wrong}/${data.maxWrong}\n` +
          `الأحرف المخمّنة: ${data.guessed.size ? [...data.guessed].join("، ") : "لا يوجد"}\n\n` +
          "اكتب حرفًا أو الكلمة كاملة في الشات."
      );
    return { embeds: [embed], rows: [] };
  }
};

async function runHangman(session: GameSession): Promise<void> {
  const data = session.gameData as { word: string; guessed: Set<string>; wrong: number; maxWrong: number };
  const playerIds = new Set(session.players.map((p) => p.id));

  while (session.status === "PLAYING") {
    const messages = await session.awaitText({
      time: ROUND_TIME,
      max: 1,
      filter: (m: Message) => playerIds.has(m.author.id)
    });
    if (session.status !== "PLAYING") return;
    if (!messages.length) {
      session.notify("انتهت المهلة — لا تخمين هذه الجولة.").catch(() => null);
      continue;
    }

    const guess = messages[0].content.trim().toLowerCase();
    const guesser = messages[0].author.id;

    if (guess.length === 1 && /[a-z\u0600-\u06FF]/.test(guess)) {
      if (data.guessed.has(guess)) {
        await session.notify("هذا الحرف مُخمَّن مسبقًا.");
        continue;
      }
      data.guessed.add(guess);
      if (data.word.includes(guess)) {
        if (isSolved(data)) {
          await finishWin(session);
          return;
        }
        await session.renderNow();
        await session.notify(`حرف صحيح! ${display(data.word, data.guessed)}`);
      } else {
        data.wrong += 1;
        await session.renderNow();
        await session.notify(`خطأ! أخطاء: ${data.wrong}/${data.maxWrong}`);
        if (data.wrong >= data.maxWrong) {
          await finishLose(session);
          return;
        }
      }
      continue;
    }

    if (guess === data.word) {
      await finishWin(session);
      return;
    }

    await session.notify(`إجابة خاطئة أو غير صالحة: ${guess}`).catch(() => null);
  }
}

function isSolved(data: { word: string; guessed: Set<string> }): boolean {
  return data.word.split("").every((ch) => data.guessed.has(ch));
}

async function finishWin(session: GameSession): Promise<void> {
  const data = session.gameData as { word: string; guessed: Set<string>; wrong: number };
  const guessers = session.players.filter((p) => p.id !== session.hostId);
  const scores: Record<string, number> = {};
  for (const p of session.players) scores[p.id] = p.id === session.hostId ? 0 : 1;
  await session.finish({
    winners: guessers.map((p) => p.id),
    scores,
    summary: `فكّ المخمّنون الكلمة: **${data.word}**`
  });
}

async function finishLose(session: GameSession): Promise<void> {
  const data = session.gameData as { word: string; guessed: Set<string>; wrong: number };
  const scores: Record<string, number> = {};
  for (const p of session.players) scores[p.id] = p.id === session.hostId ? 1 : 0;
  await session.finish({
    winners: [session.hostId],
    scores,
    summary: `اكتمل حبل الغسيل — الكلمة كانت: **${data.word}**`
  });
}

export default def;