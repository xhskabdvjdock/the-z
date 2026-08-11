import { createCanvas, SKRSContext2D, loadImage } from "@napi-rs/canvas";
import { MessageContextMenuCommandInteraction } from "discord.js";
import { ExtendedClient } from "../client";
import { BotContextMenu } from "../types/contextMenu";
import { ensureFontLoaded } from "../utils/fonts";
import { logError } from "../utils/logger";

// ─── أبعاد التصميم ──────────────────────────────────────────────────────────
const WIDTH = 1000;
// الأفاتار يملأ الثلث الأيسر كاملًا من الأعلى للأسفل (غير دائري)
const AVATAR_COLUMN = Math.round(WIDTH / 3);
const TEXT_PAD = 70;
const TEXT_X = AVATAR_COLUMN + TEXT_PAD;
const TEXT_MAX_WIDTH = WIDTH - TEXT_X - TEXT_PAD;
const MAIN_FONT_SIZE = 50;
const MAIN_LINE_HEIGHT = 72;
const MAX_TEXT_LINES = 6;
const NAME_FONT_SIZE = 34;
const USERNAME_FONT_SIZE = 26;
const MIN_HEIGHT = 500;
// ميل البطاقة (بالراديان) — 4 درجات عكس عقارب الساعة
const CARD_TILT_RAD = -(4 * Math.PI) / 180;
// عرض منطقة الدمج التدريجي بين صورة الأفاتار والخلفية السوداء
const FADE_WIDTH = 140;

interface RenderOptions {
  avatarUrl: string;
  mainText: string;
  displayName: string;
  username: string;
}

/** يقسم النص لأسطر حسب عرض القياس — يحافظ على التصميم مهما طال النص */
function wrapText(ctx: SKRSContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth || !current) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/** أسطر مقصوصة تلقائيًا: حد أقصى للأسطر مع "…" على آخر سطر */
function truncateLines(ctx: SKRSContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const lines = wrapText(ctx, text.replace(/\n+/g, " ").trim(), maxWidth);
  if (lines.length <= maxLines) return lines;

  const truncated = lines.slice(0, maxLines);
  let last = truncated[truncated.length - 1];
  while (last.length > 1 && ctx.measureText(`${last}…`).width > maxWidth) {
    last = last.slice(0, -1);
  }
  truncated[truncated.length - 1] = `${last}…`;
  return truncated;
}

/** سطر واحد مقصوص مع "…" */
function truncateOneLine(ctx: SKRSContext2D, text: string, maxWidth: number): string {
  let t = text;
  while (t.length > 1 && ctx.measureText(t).width > maxWidth) {
    t = t.slice(0, -1);
  }
  return t;
}

/** يرسم الأفاتار معبئًا العمود الأيسر كاملًا (cover) — مقصوص من الوسط */
async function drawAvatar(
  ctx: SKRSContext2D,
  avatarUrl: string,
  x: number,
  y: number,
  width: number,
  height: number
): Promise<void> {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, width, height);
  ctx.clip();
  try {
    const avatar = await loadImage(avatarUrl);
    // أبعاد تغطي المستطيل بالكامل دون تشويه
    const scale = Math.max(width / avatar.width, height / avatar.height);
    const drawW = avatar.width * scale;
    const drawH = avatar.height * scale;
    ctx.drawImage(avatar, x + (width - drawW) / 2, y + (height - drawH) / 2, drawW, drawH);
  } catch {
    ctx.fillStyle = "#1A1C23";
    ctx.fillRect(x, y, width, height);
  }
  ctx.restore();
}

export async function renderTextImage(options: RenderOptions): Promise<Buffer> {
  const fontName = await ensureFontLoaded();

  // 1) قياس ارتفاع البطاقة أولًا على كانفس مؤقتة
  const measureCanvas = createCanvas(WIDTH, 1);
  const measureCtx = measureCanvas.getContext("2d");
  measureCtx.font = `bold ${MAIN_FONT_SIZE}px "${fontName}"`;
  const lines = truncateLines(measureCtx, options.mainText || "…", TEXT_MAX_WIDTH, MAX_TEXT_LINES);

  const textBlockHeight =
    lines.length * MAIN_LINE_HEIGHT + 24 + NAME_FONT_SIZE + 18 + USERNAME_FONT_SIZE;

  const height = Math.max(MIN_HEIGHT, textBlockHeight + 180);

  // 2) الرسم الفعلي
  const canvas = createCanvas(WIDTH, height);
  const ctx = canvas.getContext("2d");

  // الخلفية سوداء بالكامل حول البطاقة المائلة
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, WIDTH, height);

  // إمالة البطاقة حول مركزها — الخلفية السوداء تستر الزوايا البارزة
  const cx = WIDTH / 2;
  const cy = height / 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(CARD_TILT_RAD);
  ctx.translate(-cx, -cy);

  // الأفاتار على الثلث الأيسر كاملًا
  await drawAvatar(ctx, options.avatarUrl, 0, 0, AVATAR_COLUMN, height);

  // دمج تدريجي بين حافة الصورة والخلفية السوداء (Fade)
  const fade = ctx.createLinearGradient(AVATAR_COLUMN - FADE_WIDTH, 0, AVATAR_COLUMN, 0);
  fade.addColorStop(0, "rgba(0, 0, 0, 0)");
  fade.addColorStop(1, "rgba(0, 0, 0, 1)");
  ctx.fillStyle = fade;
  ctx.fillRect(AVATAR_COLUMN - FADE_WIDTH, 0, FADE_WIDTH, height);

  // الكتلة النصية في منتصف العمود الأيمن عموديًا
  const textStartY = Math.max(90, (height - textBlockHeight) / 2 - 10);

  ctx.textAlign = "left";
  ctx.textBaseline = "top";

  // النص الرئيسي — أبيض كبير
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `bold ${MAIN_FONT_SIZE}px "${fontName}"`;
  lines.forEach((line, i) => {
    ctx.fillText(line, TEXT_X, textStartY + i * MAIN_LINE_HEIGHT);
  });

  // اسم الشخص — تحت النص مباشرة
  const nameY = textStartY + lines.length * MAIN_LINE_HEIGHT + 24;
  ctx.fillStyle = "#E8EAED";
  ctx.font = `bold ${NAME_FONT_SIZE}px "${fontName}"`;
  ctx.fillText(truncateOneLine(ctx, options.displayName || options.username, TEXT_MAX_WIDTH), TEXT_X, nameY);

  // @اليوزر — رمادي صغير تحت الاسم
  const usernameY = nameY + NAME_FONT_SIZE + 18;
  ctx.fillStyle = "#8E9297";
  ctx.font = `${USERNAME_FONT_SIZE}px "${fontName}"`;
  ctx.fillText(`@${truncateOneLine(ctx, options.username, TEXT_MAX_WIDTH)}`, TEXT_X, usernameY);

  ctx.restore();

  return canvas.toBuffer("image/png");
}

const command: BotContextMenu = {
  name: "Text Image",
  type: "message",
  async run(client: ExtendedClient, interaction: MessageContextMenuCommandInteraction) {
    await interaction.deferReply();

    try {
      const target = interaction.targetMessage;
      const message = target.partial ? await target.fetch() : target;
      const author = message.author;
      if (!author) {
        await interaction.editReply({ content: "❌ لا يمكن تحديد صاحب الرسالة." });
        return;
      }

      // اسم العرض: من العضو إن أمكن وإلا الاسم العالمي
      let displayName = author.globalName ?? author.username;
      if (interaction.guild) {
        try {
          const member = await interaction.guild.members.fetch(author.id);
          displayName = member.displayName || displayName;
        } catch {
          // العضو خارج السيرفر — نكتفي بالاسم العالمي
        }
      }

      const mainText = message.content?.trim() || "…";
      const avatarUrl = author.displayAvatarURL({ extension: "png", size: 512 });

      const buffer = await renderTextImage({
        avatarUrl,
        mainText,
        displayName,
        username: author.username
      });

      await interaction.editReply({
        files: [{ attachment: buffer, name: "text-image.png" }]
      });
    } catch (err) {
      logError("text-image", err);
      await interaction.editReply({ content: "❌ تعذر إنشاء الصورة." }).catch(() => null);
    }
  }
};

export default command;