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

const MAX_ROUNDS = 12;
const SHOW_TIME = 1800;

const def: GameDefinition<{
  seq: Color[];
  showing: boolean;
  input: Color[];
  index: number;
}> = {
  name: "simon",
  aliases: ["سايمون", "ذكر"],
  title: "سايمون",
  description: "كرر تسلسل الألوان المتنامي — إلى أين تصل؟",
  instructions:
    "يعرض البوت تسلسلًا من الألوان ثم يختفي.\n" +
    "اضغط الألوان بنفس الترتيب.\n" +
    "مع كل جولة صحيحة يطول التسلسل — خطأ واحد ينهي اللعبة.",
  category: "singleplayer",
  minPlayers: 1,
  maxPlayers: 1,
  durationLabel: "3-5 دقائق",
  cooldownSeconds: 3,

  onStart(session) {
    session.gameData = { seq: [randColor()], showing: true, input: [], index: 0 };
    session.phase = "playing";
    scheduleShow(session);
  },

  onAction(session, action) {
    if (action.type !== "press") return;
    const data = session.gameData as { seq: Color[]; showing: boolean; input: Color[]; index: number };
    if (data.showing) return; // التسلسل ما زال يُعرض
    const color = action.value as Color;
    if (!COLORS.includes(color)) return;

    data.input.push(color);

    // تحقق
    if (color !== data.seq[data.input.length - 1]) {
      session.finish({
        winners: [],
        scores: { [session.players[0].id]: data.index },
        summary: `خطأ! وصلت إلى مستوى ${data.index}.`
      });
      return;
    }

    if (data.input.length === data.seq.length) {
      // اكتمل التسلسل — أضف لونًا جديدًا
      data.index += 1;
      if (data.index >= MAX_ROUNDS) {
        session.finish({
          winners: [session.players[0].id],
          scores: { [session.players[0].id]: data.index },
          summary: `أكملت ${MAX_ROUNDS} مستوى! إنجاز مذهل.`
        });
        return;
      }
      data.seq.push(randColor());
      data.input = [];
      data.showing = true;
      scheduleShow(session);
    }
  },

  render(session) {
    const data = session.gameData as { seq: Color[]; showing: boolean; input: Color[]; index: number };
    const embed = new EmbedBuilder()
      .setTitle("سايمون")
      .setDescription(
        data.showing
          ? `التسلسل: **${data.seq.map((c) => COLOR_LABELS[c]).join(" ← ")}**`
          : "كرر التسلسل الآن."
      )
      .addFields({ name: "المستوى", value: `${data.index + 1}/${MAX_ROUNDS}`, inline: true });

    const row = new ActionRowBuilder<ButtonBuilder>();
    for (const color of COLORS) {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`game:${session.id}:press:${color}`)
          .setLabel(COLOR_LABELS[color])
          .setStyle(COLOR_STYLE[color])
          .setDisabled(data.showing)
      );
    }
    return { embeds: [embed], rows: [row] };
  }
};

function scheduleShow(session: any): void {
  session.setTimer("show", SHOW_TIME, () => {
    if (session.status !== "PLAYING") return;
    const data = session.gameData as { seq: Color[]; showing: boolean; input: Color[]; index: number };
    data.showing = false;
    session.renderNow().catch(() => null);
  });
}

function randColor(): Color {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

export default def;