import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} from "discord.js";
import { GameDefinition } from "../core/types";

interface MathQ {
  text: string;
  correct: number;
  options: number[];
}

function genQuestion(): MathQ {
  const a = 1 + Math.floor(Math.random() * 20);
  const b = 1 + Math.floor(Math.random() * 20);
  const op = Math.random() < 0.5 ? "+" : "×";
  const correct = op === "+" ? a + b : a * b;
  const options = new Set<number>([correct]);
  while (options.size < 4) {
    options.add(correct + Math.floor(Math.random() * 9) - 4);
  }
  return { text: `${a} ${op} ${b} = ?`, correct, options: shuffle([...options]) };
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const TOTAL = 10;
const ROUND_TIME = 15_000;

const def: GameDefinition<{
  questions: MathQ[];
  index: number;
  correct: number;
}> = {
  name: "math",
  aliases: ["حساب", "maths"],
  title: "الحساب",
  description: "أجب عن 10 مسائل حسابية — كم إجابة صحيحة تحصل؟",
  instructions:
    "تظهر مسألة حسابية و4 خيارات.\n" +
    "اختر الإجابة الصحيحة خلال 15 ثانية.\n" +
    "الإجابات الصحيحة تزيد نتيجتك.",
  category: "singleplayer",
  minPlayers: 1,
  maxPlayers: 1,
  durationLabel: "3 دقائق تقريبًا",
  cooldownSeconds: 3,

  onStart(session) {
    session.gameData = {
      questions: Array.from({ length: TOTAL }, genQuestion),
      index: 0,
      correct: 0
    };
    session.phase = "playing";
    scheduleRound(session);
  },

  onAction(session, action) {
    if (action.type !== "ans") return;
    const data = session.gameData as { questions: MathQ[]; index: number; correct: number };
    if (data.index >= data.questions.length) return;

    const q = data.questions[data.index];
    const value = Number(action.value);
    if (value === q.correct) {
      data.correct += 1;
      session.notify("إجابة صحيحة!").catch(() => null);
    }

    advance(session);
  },

  render(session) {
    const data = session.gameData as { questions: MathQ[]; index: number; correct: number };
    const q = data.questions[data.index];

    const embed = new EmbedBuilder()
      .setTitle("الحساب")
      .setDescription(
        q
          ? `السؤال ${data.index + 1}/${data.questions.length}:\n**${q.text}**`
          : "انتهت الأسئلة."
      )
      .addFields({ name: "الصحيح", value: `${data.correct}`, inline: true });

    if (!q) return { embeds: [embed], rows: [] };

    const row = new ActionRowBuilder<ButtonBuilder>();
    for (const opt of q.options) {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`game:${session.id}:ans:${opt}`)
          .setLabel(String(opt))
          .setStyle(ButtonStyle.Primary)
      );
    }
    return { embeds: [embed], rows: [row] };
  }
};

function advance(session: any): void {
  const data = session.gameData as { questions: MathQ[]; index: number; correct: number };
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