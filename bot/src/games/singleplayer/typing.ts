import { EmbedBuilder, Message } from "discord.js";
import { GameDefinition, GameSession } from "../core/types";

const SENTENCES = [
  "القطط تحب الحليب",
  "الجو جميل اليوم",
  "أحب البرمجة",
  "النجوم تضيء السماء",
  "أنا أتعلم بسرعة",
  "التعلم رحلة ممتعة",
  "الماء سر الحياة",
  "العمل الجاد مفتاح النجاح"
];

const ROUND_TIME = 30_000;

const def: GameDefinition<{ sentence: string; startedAt: number }> = {
  name: "typing",
  aliases: ["طباعة", "typefast"],
  title: "الطباعة",
  description: "اكتب الجملة المعروضة بأسرع وقت ودقة كاملة.",
  instructions:
    "تظهر جملة يجب كتابتها حرفًا بحرف خلال 30 ثانية.\n" +
    "الكتابة الصحيحة في الوقت تمنحك نتيجة حسب سرعتك.",
  category: "singleplayer",
  minPlayers: 1,
  maxPlayers: 1,
  durationLabel: "30 ثانية",
  cooldownSeconds: 3,

  onStart(session) {
    session.gameData = {
      sentence: SENTENCES[Math.floor(Math.random() * SENTENCES.length)],
      startedAt: Date.now()
    };
    session.phase = "playing";
    void runTyping(session);
  },

  onAction() {
    /* إجابات نصية */
  },

  render(session) {
    const data = session.gameData as { sentence: string; startedAt: number };
    const embed = new EmbedBuilder()
      .setTitle("الطباعة")
      .setDescription(`اكتب هذه الجملة:\n**${data.sentence}**\n\n(لديك 30 ثانية)`);
    return { embeds: [embed], rows: [] };
  }
};

async function runTyping(session: GameSession): Promise<void> {
  const data = session.gameData as { sentence: string; startedAt: number };
  const messages = await session.awaitText({
    time: ROUND_TIME,
    max: 1,
    filter: (m: Message) => m.author.id === session.players[0].id
  });
  if (session.status !== "PLAYING") return;

  if (!messages.length) {
    await session.finish({ winners: [], scores: { [session.players[0].id]: 0 }, summary: "انتهى الوقت قبل الكتابة." });
    return;
  }

  const answer = messages[0].content.trim();
  if (answer !== data.sentence) {
    await session.finish({ winners: [], scores: { [session.players[0].id]: 0 }, summary: "الجملة غير مطابقة تمامًا." });
    return;
  }

  const ms = Date.now() - data.startedAt;
  const score = Math.max(0, 10_000 - ms);
  await session.finish({
    winners: [session.players[0].id],
    scores: { [session.players[0].id]: score },
    summary: `كتبت الجملة في ${(ms / 1000).toFixed(1)} ثانية!`
  });
}

export default def;