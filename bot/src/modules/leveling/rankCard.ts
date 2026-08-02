import { GuildMember } from "discord.js";
import { createCanvas, loadImage, SKRSContext2D } from "@napi-rs/canvas";

interface RankCardData {
  level: number;
  currentXp: number;
  neededXp: number;
  rank: number;
  totalXp: number;
}

const WIDTH = 1000;
const HEIGHT = 220;

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

  // الخلفية الأساسية للبطاقة
  ctx.fillStyle = "#121318";
  drawRoundedRect(ctx, 0, 0, WIDTH, HEIGHT, 12);
  ctx.fill();

  // إطار رقيق
  ctx.strokeStyle = "#2A2D37";
  ctx.lineWidth = 1;
  drawRoundedRect(ctx, 0.5, 0.5, WIDTH - 1, HEIGHT - 1, 12);
  ctx.stroke();

  // اللوحة اليسرى (70% من العرض)
  const leftPanelWidth = WIDTH * 0.7;
  const leftPanelX = 0;
  
  // صورة الأفاتار دائرية في أقصى اليسار
  const avatarSize = 120;
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
    
    // اسم المستخدم في أعلى الأفاتار
    ctx.font = "bold 14px sans-serif";
    ctx.fillStyle = "#F5F5F5";
    ctx.textAlign = "center";
    ctx.fillText(truncate(ctx, member.displayName, avatarSize - 20), avatarX + avatarSize / 2, avatarY + 25);
    
    // XP في أسفل الأفاتار
    ctx.font = "bold 12px sans-serif";
    ctx.fillStyle = "#F1E0C5";
    ctx.fillText(`${data.currentXp} XP`, avatarX + avatarSize / 2, avatarY + avatarSize - 15);
    
    ctx.restore();
  } catch {
    // تجاهل فشل تحميل الصورة
  }

  // معلومات العضو إلى يمين الأفاتار
  const infoX = avatarX + avatarSize + 30;

  // اسم المستخدم
  ctx.fillStyle = "#F5F5F5";
  ctx.font = "bold 32px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(truncate(ctx, member.displayName, 300), infoX, 55);

  // عناوين البيانات (Labels)
  ctx.font = "bold 11px sans-serif";
  ctx.fillStyle = "#6B7280";
  
  const labelY = 85;
  const labelSpacing = 35;
  
  ctx.fillText("SERVER RANK", infoX, labelY);
  ctx.fillText("WEEKLY RANK", infoX + 140, labelY);
  ctx.fillText("WEEKLY EXP", infoX + 280, labelY);

  // قيم البيانات
  ctx.font = "bold 18px sans-serif";
  ctx.fillStyle = "#F5F5F5";
  
  const valueY = labelY + 22;
  
  ctx.fillText(`#${data.rank}`, infoX, valueY);
  ctx.fillText("Off", infoX + 140, valueY);
  ctx.fillText("0", infoX + 280, valueY);

  // شريط التقدم في أسفل اللوحة اليسرى
  const progressBarY = HEIGHT - 8;
  const progressBarHeight = 4;
  const progress = data.neededXp > 0 ? Math.min(Math.max(data.currentXp / data.neededXp, 0), 1) : 0;

  // خلفية الشريط
  ctx.fillStyle = "#1A1C23";
  ctx.fillRect(20, progressBarY, leftPanelWidth - 40, progressBarHeight);

  // التقدم
  if (progress > 0) {
    ctx.fillStyle = "#F1E0C5";
    ctx.fillRect(20, progressBarY, (leftPanelWidth - 40) * progress, progressBarHeight);
  }

  // اللوحة اليمنى (30% من العرض)
  const rightPanelX = leftPanelWidth;
  const rightPanelWidth = WIDTH - leftPanelWidth;
  const gap = 1;

  // خط فاصل بين اللوحتين
  ctx.fillStyle = "#2A2D37";
  ctx.fillRect(rightPanelX - gap, 20, gap, HEIGHT - 40);

  // صندوق المستوى
  const levelBoxY = 30;
  const levelBoxHeight = 70;
  const levelBoxPadding = 15;

  ctx.fillStyle = "#1A1C23";
  drawRoundedRect(ctx, rightPanelX + 20, levelBoxY, rightPanelWidth - 40, levelBoxHeight, 8);
  ctx.fill();

  // عنوان LEVEL
  ctx.font = "bold 10px sans-serif";
  ctx.fillStyle = "#6B7280";
  ctx.textAlign = "left";
  ctx.fillText("LEVEL", rightPanelX + 30, levelBoxY + 20);

  // مستطيل داخلي أسود للمستوى
  const levelInnerBoxY = levelBoxY + 28;
  const levelInnerBoxHeight = 32;
  
  ctx.fillStyle = "#000000";
  drawRoundedRect(ctx, rightPanelX + 30, levelInnerBoxY, rightPanelWidth - 60, levelInnerBoxHeight, 6);
  ctx.fill();

  // رقم المستوى
  ctx.font = "bold 24px sans-serif";
  ctx.fillStyle = "#F5F5F5";
  ctx.textAlign = "center";
  ctx.fillText(`${data.level}`, rightPanelX + rightPanelWidth / 2, levelInnerBoxY + 22);

  // صندوق EXP
  const expBoxY = levelBoxY + levelBoxHeight + 20;
  const expBoxHeight = 70;

  ctx.fillStyle = "#1A1C23";
  drawRoundedRect(ctx, rightPanelX + 20, expBoxY, rightPanelWidth - 40, expBoxHeight, 8);
  ctx.fill();

  // عنوان EXP
  ctx.font = "bold 10px sans-serif";
  ctx.fillStyle = "#6B7280";
  ctx.textAlign = "left";
  ctx.fillText("EXP", rightPanelX + 30, expBoxY + 20);

  // مستطيل داخلي أسود للـ EXP
  const expInnerBoxY = expBoxY + 28;
  const expInnerBoxHeight = 32;
  
  ctx.fillStyle = "#000000";
  drawRoundedRect(ctx, rightPanelX + 30, expInnerBoxY, rightPanelWidth - 60, expInnerBoxHeight, 6);
  ctx.fill();

  // نسبة EXP
  ctx.font = "bold 16px sans-serif";
  ctx.fillStyle = "#F5F5F5";
  ctx.textAlign = "center";
  ctx.fillText(`${data.currentXp} / ${data.neededXp}`, rightPanelX + rightPanelWidth / 2, expInnerBoxY + 21);

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
