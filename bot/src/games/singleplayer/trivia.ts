import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} from "discord.js";
import { GameDefinition } from "../core/types";
import { randomTrivia, TriviaQuestion } from "../data/trivia";

const TOTAL = 10;
const ROUND_TIME = 15_000;

const def: GameDefinition<{
  questions: TriviaQuestion[];
  index: number;
  correct: number;
}> = {
  name: "trivia",
  aliases: ["أسئلة", "quiz"],
  title: "الأسئلة",
  description: "اختبر معلوماتك العامة — 10 أسئلة بأربعة خيارات.",
  instructions:
    "تظهر أسئلة معلومات عامة بأربعة خيارات.\n" +
    "اختر الإجابة الصحيحة خلال 15 ثانية.\n" +
    "كم سؤالًا صحيحًا تحصل عليه؟",
  category: "singleplayer",
  minPlayers: 1,
  maxPlayers: 1,
  durationLabel: "4 دقائق تقريبًا",
  cooldownSeconds: 5,

  onStart(session) {
    session.gameData = {
      questions: randomTrivia(TOTAL),
      index: 0,
      correct: 0
    };
    session.phase = "playing";
    scheduleRound(session);
  },

  onAction(session, action) {
    if (action.type !== "ans") return;
    const data = session.gameData as { questions: TriviaQuestion[]; index: number; correct: number };
    if (data.index >= data.questions.length) return;

    const q = data.questions[data.index];
    if (action.value === String(q.correct)) {
      data.correct += 1;
      session.notify("إجابة صحيحة!").catch(() => null);
    } else {
      session.notify(`الإجابة الصحيحة: ${q.options[q.correct]}`).catch(() => null);
    }
    advance(session);
  },

  render(session) {
    const data = session.gameData as { questions: TriviaQuestion[]; index: number; correct: number };
    const q = data.questions[data.index];

    const embed = new EmbedBuilder()
      .setTitle("الأسئلة")
      .setDescription(
        q
          ? `السؤال ${data.index + 1}/${data.questions.length}:\n**${q.q}**`
          : "انتهت الأسئلة."
      )
      .addFields({ name: "الصحيح", value: `${data.correct}`, inline: true });

    if (!q) return { embeds: [embed], rows: [] };

    const row = new ActionRowBuilder<ButtonBuilder>();
    q.options.forEach((opt, i) => {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`game:${session.id}:ans:${i}`)
          .setLabel(opt)
          .setStyle(ButtonStyle.Primary)
      );
    });
    return { embeds: [embed], rows: [row] };
  }
};

function advance(session: any): void {
  const data = session.gameData as { questions: TriviaQuestion[]; index: number; correct: number };
  session.clearTimer("q");
  data.index += 1;
  if (data.index >= data.questions.length) {
    const score = data.correct;
    session.finish({
      winners: data.correct >= Math.ceil(data.questions.length / 2) ? [session.players[0].id] : [],
      scores: { [session.players[0].id]: score },
      summary: `أجبت صحيحًا على ${data.correct}/${data.questions.length} سؤالًا.`
    });
    return;
  }
  session.renderNow().catch(() => null);
  scheduleRound(session);
}

function scheduleRound(session: any): void {
  session.setTimer("q", ROUND_TIME, () => {
    if (session.status !== "PLAYING") return;
    session.notify("انتهت مهلة السؤال.").catch(() => null);
    advance(session);
  });
}

export default def;