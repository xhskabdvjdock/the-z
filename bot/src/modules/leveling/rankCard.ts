import { GuildMember } from "discord.js";
import { createCanvas, loadImage, SKRSContext2D } from "@napi-rs/canvas";

interface RankCardData {
  level: number;
  currentXp: number;
  neededXp: number;
  rank: number;
  totalXp: number;
}

const WIDTH = 934;
const HEIGHT = 282;

/** يرسم مستطيلاً بزوايا دائرية على الكانفاس */
function drawRoundedRect(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  const r = Math.min(radius, height / 2, width / 2);
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, r);
}

/** يولّد صورة بطاقة الرتبة (PNG) لعضو معيّن باستخدام @napi-rs/canvas */
export async function generateRankCard(member: GuildMember, data: RankCardData): Promise<Buffer> {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");

  // الخلفية: تدرج داكن أنيق
  const bgGradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  bgGradient.addColorStop(0, "#1e1b3a");
  bgGradient.addColorStop(1, "#0d0b1f");
  ctx.fillStyle = bgGradient;
  drawRoundedRect(ctx, 0, 0, WIDTH, HEIGHT, 24);
  ctx.fill();

  // شريط زخرفي جانبي
  const sideGradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  sideGradient.addColorStop(0, "#7c3aed");
  sideGradient.addColorStop(1, "#312e81");
  ctx.fillStyle = sideGradient;
  ctx.fillRect(0, 0, 10, HEIGHT);

  // إطار خفيف حول البطاقة
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 2;
  drawRoundedRect(ctx, 1, 1, WIDTH - 2, HEIGHT - 2, 24);
  ctx.stroke();

  // صورة العضو (دائرية)
  const avatarSize = 180;
  const avatarX = 56;
  const avatarY = (HEIGHT - avatarSize) / 2;

  try {
    const avatarUrl = member.displayAvatarURL({ extension: "png", size: 256 });
    const avatar = await loadImage(avatarUrl);
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
    ctx.restore();
  } catch {
    // تجاهل فشل تحميل الصورة، تُترك البطاقة بدون صورة
  }

  // إطار حول الصورة
  ctx.beginPath();
  ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2 + 4, 0, Math.PI * 2);
  ctx.strokeStyle = "#a78bfa";
  ctx.lineWidth = 6;
  ctx.stroke();

  const textX = avatarX + avatarSize + 40;

  // اسم العضو
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 42px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(truncate(ctx, member.displayName, 340), textX, 95);

  // الترتيب
  ctx.textAlign = "right";
  ctx.font = "bold 32px sans-serif";
  ctx.fillStyle = "#a78bfa";
  ctx.fillText(`#${data.rank}`, WIDTH - 60, 65);

  // المستوى
  ctx.font = "bold 26px sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(`المستوى ${data.level}`, WIDTH - 60, 105);
  ctx.textAlign = "left";

  // شريط التقدم
  const barX = textX;
  const barY = 165;
  const barWidth = WIDTH - textX - 60;
  const barHeight = 34;
  const progress = data.neededXp > 0 ? Math.min(Math.max(data.currentXp / data.neededXp, 0), 1) : 0;

  ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
  drawRoundedRect(ctx, barX, barY, barWidth, barHeight, 17);
  ctx.fill();

  if (progress > 0) {
    const fillWidth = Math.max(barWidth * progress, barHeight);
    const fillGradient = ctx.createLinearGradient(barX, 0, barX + fillWidth, 0);
    fillGradient.addColorStop(0, "#7c3aed");
    fillGradient.addColorStop(1, "#c084fc");
    ctx.fillStyle = fillGradient;
    drawRoundedRect(ctx, barX, barY, fillWidth, barHeight, 17);
    ctx.fill();
  }

  // نص الخبرة أعلى الشريط
  ctx.font = "20px sans-serif";
  ctx.fillStyle = "#e5e7eb";
  ctx.textAlign = "right";
  ctx.fillText(`${data.currentXp} / ${data.neededXp} XP`, barX + barWidth, barY - 12);

  // إجمالي الخبرة أسفل الشريط
  ctx.font = "18px sans-serif";
  ctx.fillStyle = "#9ca3af";
  ctx.fillText(`إجمالي الخبرة: ${data.totalXp}`, barX + barWidth, barY + barHeight + 26);
  ctx.textAlign = "left";

  return canvas.encode("png");
}

/** يقصّ النص إن تجاوز عرضاً معيّناً ويضيف "..." */
function truncate(ctx: SKRSContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let truncated = text;
  while (truncated.length > 1 && ctx.measureText(`${truncated}…`).width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return `${truncated}…`;
}
