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

  // الخلفية: Dark Slate Theme
  const bgGradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  bgGradient.addColorStop(0, "#1A1C23");
  bgGradient.addColorStop(1, "#090A0F");
  ctx.fillStyle = bgGradient;
  drawRoundedRect(ctx, 0, 0, WIDTH, HEIGHT, 16);
  ctx.fill();

  // إطار خفيف حول البطاقة
  ctx.strokeStyle = "rgba(88, 101, 242, 0.3)";
  ctx.lineWidth = 2;
  drawRoundedRect(ctx, 1, 1, WIDTH - 2, HEIGHT - 2, 16);
  ctx.stroke();

  // صورة العضو (دائرية) مع إطار Discord
  const avatarSize = 160;
  const avatarX = 50;
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

  // إطار Discord حول الصورة
  ctx.beginPath();
  ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2 + 4, 0, Math.PI * 2);
  ctx.strokeStyle = "#5865F2";
  ctx.lineWidth = 4;
  ctx.stroke();

  const textX = avatarX + avatarSize + 35;

  // اسم العضو
  ctx.fillStyle = "#F0F0F0";
  ctx.font = "bold 40px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(truncate(ctx, member.displayName, 320), textX, 85);

  // الترتيب - خلفية صغيرة
  const rankText = `#${data.rank}`;
  ctx.font = "bold 28px sans-serif";
  const rankWidth = ctx.measureText(rankText).width;
  const rankX = WIDTH - 50 - rankWidth;
  
  ctx.fillStyle = "rgba(88, 101, 242, 0.2)";
  drawRoundedRect(ctx, rankX - 10, 45, rankWidth + 20, 38, 8);
  ctx.fill();
  
  ctx.fillStyle = "#5865F2";
  ctx.fillText(rankText, rankX, 72);

  // المستوى
  ctx.font = "bold 24px sans-serif";
  ctx.fillStyle = "#9CA3AF";
  ctx.fillText(`المستوى ${data.level}`, textX, 125);

  // شريط التقدم المحسّن
  const barX = textX;
  const barY = 160;
  const barWidth = WIDTH - textX - 50;
  const barHeight = 24;
  const progress = data.neededXp > 0 ? Math.min(Math.max(data.currentXp / data.neededXp, 0), 1) : 0;

  // خلفية الشريط
  ctx.fillStyle = "rgba(42, 45, 55, 0.8)";
  drawRoundedRect(ctx, barX, barY, barWidth, barHeight, 12);
  ctx.fill();

  if (progress > 0) {
    const fillWidth = Math.max(barWidth * progress, barHeight);
    const fillGradient = ctx.createLinearGradient(barX, 0, barX + fillWidth, 0);
    fillGradient.addColorStop(0, "#5865F2");
    fillGradient.addColorStop(1, "#7C83A5");
    ctx.fillStyle = fillGradient;
    drawRoundedRect(ctx, barX, barY, fillWidth, barHeight, 12);
    ctx.fill();
  }

  // نص الخبرة
  ctx.font = "18px sans-serif";
  ctx.fillStyle = "#9CA3AF";
  ctx.textAlign = "right";
  ctx.fillText(`${data.currentXp} / ${data.neededXp} XP`, barX + barWidth, barY - 10);

  // إجمالي الخبرة
  ctx.font = "16px sans-serif";
  ctx.fillStyle = "#6B7280";
  ctx.fillText(`إجمالي: ${data.totalXp} XP`, barX + barWidth, barY + barHeight + 22);
  ctx.textAlign = "left";

  // شعار السيرفر (اختياري)
  try {
    const iconUrl = member.guild.iconURL({ extension: "png", size: 64 });
    if (iconUrl) {
      const icon = await loadImage(iconUrl);
      ctx.save();
      ctx.globalAlpha = 0.15;
      ctx.drawImage(icon, WIDTH - 80, HEIGHT - 80, 64, 64);
      ctx.restore();
    }
  } catch {
    // تجاهل فشل تحميل الشعار
  }

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
