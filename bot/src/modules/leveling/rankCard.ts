import { GuildMember } from "discord.js";
import { createCanvas, loadImage, SKRSContext2D } from "@napi-rs/canvas";

interface RankCardData {
  level: number;
  currentXp: number;
  neededXp: number;
  rank: number;
  totalXp: number;
}

const WIDTH = 900;
const HEIGHT = 200;

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
  drawRoundedRect(ctx, 0, 0, WIDTH, HEIGHT, 20);
  ctx.fill();

  // إطار Discord blue
  ctx.strokeStyle = "rgba(88, 101, 242, 0.4)";
  ctx.lineWidth = 3;
  drawRoundedRect(ctx, 2, 2, WIDTH - 4, HEIGHT - 4, 20);
  ctx.stroke();

  // صورة العضو (دائرية) على اليسار
  const avatarSize = 140;
  const avatarX = 40;
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
    // تجاهل فشل تحميل الصورة
  }

  // إطار Discord blue حول الأفاتار
  ctx.beginPath();
  ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2 + 5, 0, Math.PI * 2);
  ctx.strokeStyle = "#5865F2";
  ctx.lineWidth = 5;
  ctx.stroke();

  // معلومات العضو على اليمين
  const infoX = avatarX + avatarSize + 40;

  // اسم العضو
  ctx.fillStyle = "#F0F0F0";
  ctx.font = "bold 36px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(truncate(ctx, member.displayName, 400), infoX, 65);

  // الترتيب والمستوى في سطر واحد
  ctx.font = "bold 20px sans-serif";
  ctx.fillStyle = "#9CA3AF";
  ctx.fillText(`الترتيب #${data.rank} • المستوى ${data.level}`, infoX, 95);

  // شريط التقدم
  const barX = infoX;
  const barY = 120;
  const barWidth = WIDTH - infoX - 40;
  const barHeight = 28;
  const progress = data.neededXp > 0 ? Math.min(Math.max(data.currentXp / data.neededXp, 0), 1) : 0;

  // خلفية الشريط
  ctx.fillStyle = "rgba(42, 45, 55, 0.9)";
  drawRoundedRect(ctx, barX, barY, barWidth, barHeight, 14);
  ctx.fill();

  if (progress > 0) {
    const fillWidth = Math.max(barWidth * progress, barHeight);
    const fillGradient = ctx.createLinearGradient(barX, 0, barX + fillWidth, 0);
    fillGradient.addColorStop(0, "#5865F2");
    fillGradient.addColorStop(1, "#7C83A5");
    ctx.fillStyle = fillGradient;
    drawRoundedRect(ctx, barX, barY, fillWidth, barHeight, 14);
    ctx.fill();
  }

  // نص الخبرة
  ctx.font = "bold 16px sans-serif";
  ctx.fillStyle = "#F0F0F0";
  ctx.textAlign = "center";
  ctx.fillText(`${data.currentXp} / ${data.neededXp} XP`, barX + barWidth / 2, barY + 19);

  // إجمالي الخبرة أسفل الشريط
  ctx.font = "14px sans-serif";
  ctx.fillStyle = "#6B7280";
  ctx.textAlign = "left";
  ctx.fillText(`إجمالي: ${data.totalXp} XP`, barX, barY + barHeight + 25);

  // شعار السيرفر كعلامة مائية
  try {
    const iconUrl = member.guild.iconURL({ extension: "png", size: 64 });
    if (iconUrl) {
      const icon = await loadImage(iconUrl);
      ctx.save();
      ctx.globalAlpha = 0.12;
      ctx.drawImage(icon, WIDTH - 70, HEIGHT - 70, 60, 60);
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
