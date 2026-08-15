import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} from "discord.js";
import { GameDefinition } from "../core/types";

const COLORS = ["red", "blue", "green", "yellow"] as const;
type Color = (typeof COLORS)[number];

const COLOR_LABELS: Record<Color, string> = {
  red: "أحمر",
  blue: "أزرق",
  green: "أخضر",
  yellow: "أصفر"
};

const COLOR_STYLE: Record<Color, ButtonStyle> = {
  red: ButtonStyle.Danger,
  blue: ButtonStyle.Primary,
  green: ButtonStyle.Success,
  yellow: ButtonStyle.Secondary
};

const TOTAL = 8;
const ROUND_TIME = 10_000;

function randColor(): Color {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

const def: GameDefinition<{
  ink: Color;
  correct: number;
  index: number;
}> = {
  name: "colortile",
  aliases: ["بلاطة-اللون", "stroop"],
  title: "بلاطة اللون",
  description: "انتبه للألوان — اضغط الزر الذي لونه يطابق الكلمة.",
  instructions:
    "تظهر كلمة لون مكتوبة بلون معين (الحبر).\n" +
    "اضغط الزر الذي يمثل لون الحبر، وليس الكلمة نفسها.\n" +
    "8 جولات، كل جولة 10 ثوانٍ.",
  category: "singleplayer",
  minPlayers: 1,
  maxPlayers: 1,
  durationLabel: "دقيقة ونصف",
  cooldownSeconds: 3,

  onStart(session) {
    session.gameData = { ink: randColor(), correct: 0, index: 0 };
    session.phase = "playing";
    scheduleRound(session);
  },

  onAction(session, action) {
    if (action.type !== "pick") return;
    const data = session.gameData as { ink: Color; correct: number; index: number };
    if (data.index >= TOTAL) return;

    if (action.value === data.ink) {
      data.correct += 1;
      session.notify("صحيح!").catch(() => null);
    }
    advance(session);
  },

  render(session) {
    const data = session.gameData as { ink: Color; correct: number; index: number };
    const word = randColor();

    const embed = new EmbedBuilder()
      .setTitle("بلاطة اللون")
      .setDescription(
        `الجولة ${data.index + 1}/${TOTAL}\n\n` +
          `ما لون الحبر الذي كُتبت به الكلمة؟`
      )
      .addFields({ name: "الصحيح", value: `${data.correct}`, inline: true });

    // زر "الكلمة" يظهر بلون الحبر
    const promptRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("ignore")
        .setLabel(COLOR_LABELS[word])
        .setStyle(COLOR_STYLE[data.ink])
        .setDisabled(true)
    );

    const answers = new ActionRowBuilder<ButtonBuilder>();
    for (const color of COLORS) {
      answers.addComponents(
        new ButtonBuilder()
          .setCustomId(`game:${session.id}:pick:${color}`)
          .setLabel(COLOR_LABELS[color])
          .setStyle(ButtonStyle.Secondary)
      );
    }

    return { embeds: [embed], rows: [promptRow, answers] };
  }
};

function advance(session: any): void {
  const data = session.gameData as { ink: Color; correct: number; index: number };
  session.clearTimer("q");
  data.index += 1;
  if (data.index >= TOTAL) {
    session.finish({
      winners: data.correct >= Math.ceil(TOTAL / 2) ? [session.players[0].id] : [],
      scores: { [session.players[0].id]: data.correct },
      summary: `أصبت في ${data.correct}/${TOTAL} جولة.`
    });
    return;
  }
  data.ink = randColor();
  session.renderNow().catch(() => null);
  scheduleRound(session);
}

function scheduleRound(session: any): void {
  session.setTimer("q", ROUND_TIME, () => {
    if (session.status !== "PLAYING") return;
    session.notify("انتهت مهلة الجولة.").catch(() => null);
    advance(session);
  });
}

export default def;