import { createCanvas, SKRSContext2D, loadImage } from "@napi-rs/canvas";
import { MessageContextMenuCommandInteraction } from "discord.js";
import { ExtendedClient } from "../client";
import { BotContextMenu } from "../types/contextMenu";
import { ensureFontLoaded } from "../utils/fonts";
import { logError } from "../utils/logger";

// ─── أبعاد التصميم (مقربة من التصميم المرجعي) ───────────────────────────────
const WIDTH = 1000;
const PAD = 80;
const AVATAR_SIZE = 300;
const AVATAR_X = PAD;
const AVATAR_Y = PAD;
const RING_COLOR = "#26262B";
const TEXT_X = AVATAR_X + AVATAR_SIZE + 70;
const TEXT_MAX_WIDTH = WIDTH - TEXT_X - PAD;
const MAIN_FONT_SIZE = 54;
const MAIN_LINE_HEIGHT = 78;
const MAX_TEXT_LINES = 6;
const INFO_FONT_SIZE = 30;
const USERNAME_FONT_SIZE = 26;
const MIN_HEIGHT = 480;

interface RenderOptions {
  avatarUrl: string;
  mainText: string;
  infoText: string;
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

/** يرسم الأفاتار مقصوصًا دائريًا مع حلقة خارجية خفيفة */
async function drawAvatar(
  ctx: SKRSContext2D,
  avatarUrl: string,
  x: number,
  y: number,
  size: number
): Promise<void> {
  const radius = size / 2;
  const centerX = x + radius;
  const centerY = y + radius;

  ctx.strokeStyle = RING_COLOR;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius + 6, 0, Math.PI * 2);
  ctx.stroke();

  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  try {
    const avatar = await loadImage(avatarUrl);
    ctx.drawImage(avatar, x, y, size, size);
  } catch {
    ctx.fillStyle = "#1A1C23";
    ctx.fillRect(x, y, size, size);
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

  const textStartY = AVATAR_Y + 36;
  const mainTextHeight = lines.length * MAIN_LINE_HEIGHT;
  const infoY = textStartY + mainTextHeight + 34;
  const usernameY = infoY + INFO_FONT_SIZE + 26;
  const textBottom = usernameY + USERNAME_FONT_SIZE + 30;
  const avatarBottom = AVATAR_Y + AVATAR_SIZE;

  const height = Math.max(
    textBottom + PAD,
    avatarBottom + PAD,
    MIN_HEIGHT
  );

  // 2) الرسم الفعلي
  const canvas = createCanvas(WIDTH, height);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, WIDTH, height);

  await drawAvatar(ctx, options.avatarUrl, AVATAR_X, AVATAR_Y, AVATAR_SIZE);

  ctx.textAlign = "left";
  ctx.textBaseline = "top";

  // النص الرئيسي — أبيض كبير
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `bold ${MAIN_FONT_SIZE}px "${fontName}"`;
  lines.forEach((line, i) => {
    ctx.fillText(line, TEXT_X, textStartY + i * MAIN_LINE_HEIGHT);
  });

  // المعلومات الإضافية — أصغر ورمادي فاتح
  ctx.fillStyle = "#9AA0A6";
  ctx.font = `${INFO_FONT_SIZE}px "${fontName}"`;
  ctx.fillText(truncateOneLine(ctx, options.infoText, TEXT_MAX_WIDTH), TEXT_X, infoY);

  // الاسم المستعار — صغير ورمادي
  ctx.fillStyle = "#7F8288";
  ctx.font = `${USERNAME_FONT_SIZE}px "${fontName}"`;
  ctx.fillText(`@${truncateOneLine(ctx, options.username, TEXT_MAX_WIDTH)}`, TEXT_X, usernameY);

  return canvas.toBuffer("image/png");
}

/** صياغة التاريخ بالعربية مع بديل آمن */
function formatJoinDate(timestamp: number): string {
  try {
    return new Date(timestamp).toLocaleDateString("ar", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  } catch {
    return new Date(timestamp).toLocaleDateString();
  }
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

      // معلومات إضافية عن صاحب الرسالة (بدون تعديل أي نظام قائم — قراءة فقط)
      let infoText = author.username;
      if (interaction.guild) {
        try {
          const member = await interaction.guild.members.fetch(author.id);
          const joined = formatJoinDate(member.joinedTimestamp ?? Date.now());
          const rolesCount = Math.max(member.roles.cache.size - 1, 0);
          infoText = `انضم في ${joined} • ${rolesCount} ${rolesCount === 1 ? "رتبة" : "رتب"}`;
        } catch {
          // العضو خارج السيرفر — نكتفي بالاسم
        }
      }

      const mainText = message.content?.trim() || "…";
      const avatarUrl = author.displayAvatarURL({ extension: "png", size: 512 });

      const buffer = await renderTextImage({
        avatarUrl,
        mainText,
        infoText,
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