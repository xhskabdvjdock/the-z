import { createCanvas, loadImage, GlobalFonts, SKRSContext2D } from "@napi-rs/canvas";
import { GuildMember } from "discord.js";
import fs from "fs";
import path from "path";

// --- تسجيل الخط المرفوع في المستودع بمسار ديناميكي دقيق ---
let isFontLoaded = false;
try {
  // البحث عن مسار الخط بناءً على المجلد الحالي أو الجذر
  const fontPath = path.resolve(process.cwd(), "fonts", "Cairo-Bold.ttf");
  if (fs.existsSync(fontPath)) {
    GlobalFonts.registerFromPath(fontPath, "CustomCairo");
    isFontLoaded = true;
    console.log("تم تحميل خط Cairo بنجاح من المسار:", fontPath);
  } else {
    console.warn("ملف الخط غير موجود في المسار:", fontPath);
  }
} catch (e) {
  console.error("خطأ أثناء تسجيل الخط:", e);
}

const FONT = isFontLoaded ? "CustomCairo" : "sans-serif";

interface RankCardData {
  level: number;
  currentXp: number;
  neededXp: number;
  rank: number;
  totalXp: number;
}

interface NewRankCardData {
  avatarUrl: string;
  username: string;
  level: number;
  currentExp: number;
  maxExp: number;
  serverRank: number;
}

const WIDTH = 1000;
const HEIGHT = 220;

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

function truncate(ctx: SKRSContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let truncated = text;
  while (truncated.length > 1 && ctx.measureText(`${truncated}…`).width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return `${truncated}…`;
}

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

  // اللوحة اليسرى
  const leftPanelWidth = WIDTH * 0.7;
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
    ctx.restore();
  } catch {
    // تجاهل فشل الأفاتار
  }

  const infoX = avatarX + avatarSize + 30;

  // 1. اسم المستخدم
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `bold 30px ${FONT}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(truncate(ctx, member.displayName || "User", 300), infoX, 55);

  // 2. العناوين
  ctx.font = `bold 12px ${FONT}`;
  ctx.fillStyle = "#8E9297";
  const labelY = 90;
  ctx.fillText("SERVER RANK", infoX, labelY);
  ctx.fillText("WEEKLY RANK", infoX + 140, labelY);
  ctx.fillText("WEEKLY EXP", infoX + 280, labelY);

  // 3. القيم
  ctx.font = `bold 18px ${FONT}`;
  ctx.fillStyle = "#FFFFFF";
  const valueY = labelY + 25;
  ctx.fillText(`#${data.rank ?? 1}`, infoX, valueY);
  ctx.fillText("Off", infoX + 140, valueY);
  ctx.fillText("0", infoX + 280, valueY);

  // شريط التقدم
  const progressBarY = HEIGHT - 15;
  const progressBarHeight = 6;
  const progress = data.neededXp > 0 ? Math.min(Math.max(data.currentXp / data.neededXp, 0), 1) : 0;

  ctx.fillStyle = "#1A1C23";
  ctx.fillRect(40, progressBarY, leftPanelWidth - 60, progressBarHeight);

  if (progress > 0) {
    ctx.fillStyle = "#F1E0C5";
    ctx.fillRect(40, progressBarY, (leftPanelWidth - 60) * progress, progressBarHeight);
  }

  // اللوحة اليمنى
  const rightPanelX = leftPanelWidth;
  const rightPanelWidth = WIDTH - leftPanelWidth;

  ctx.fillStyle = "#2A2D37";
  ctx.fillRect(rightPanelX - 1, 20, 1, HEIGHT - 40);

  // === صندوق LEVEL ===
  const levelBoxY = 25;
  ctx.fillStyle = "#1A1C23";
  drawRoundedRect(ctx, rightPanelX + 20, levelBoxY, rightPanelWidth - 40, 75, 8);
  ctx.fill();

  ctx.font = `bold 11px ${FONT}`;
  ctx.fillStyle = "#8E9297";
  ctx.textAlign = "left";
  ctx.fillText("LEVEL", rightPanelX + 32, levelBoxY + 20);

  const levelInnerBoxY = levelBoxY + 28;
  ctx.fillStyle = "#000000";
  drawRoundedRect(ctx, rightPanelX + 30, levelInnerBoxY, rightPanelWidth - 60, 35, 6);
  ctx.fill();

  ctx.font = `bold 20px ${FONT}`;
  ctx.fillStyle = "#FFFFFF";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`${data.level ?? 0}`, rightPanelX + rightPanelWidth / 2, levelInnerBoxY + 18);

  // === صندوق EXP ===
  const expBoxY = levelBoxY + 90;
  ctx.fillStyle = "#1A1C23";
  drawRoundedRect(ctx, rightPanelX + 20, expBoxY, rightPanelWidth - 40, 75, 8);
  ctx.fill();

  ctx.font = `bold 11px ${FONT}`;
  ctx.fillStyle = "#8E9297";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("EXP", rightPanelX + 32, expBoxY + 20);

  const expInnerBoxY = expBoxY + 28;
  ctx.fillStyle = "#000000";
  drawRoundedRect(ctx, rightPanelX + 30, expInnerBoxY, rightPanelWidth - 60, 35, 6);
  ctx.fill();

  ctx.font = `bold 14px ${FONT}`;
  ctx.fillStyle = "#FFFFFF";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`${data.currentXp ?? 0} / ${data.neededXp ?? 0}`, rightPanelX + rightPanelWidth / 2, expInnerBoxY + 18);

  return canvas.toBuffer("image/png");
}

export async function generateSimpleRankCard(data: NewRankCardData): Promise<Buffer> {
  const canvas = createCanvas(800, 200);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#121318";
  drawRoundedRect(ctx, 0, 0, 800, 200, 12);
  ctx.fill();

  ctx.strokeStyle = "#2A2D37";
  ctx.lineWidth = 1;
  drawRoundedRect(ctx, 0.5, 0.5, 799, 199, 12);
  ctx.stroke();

  const avatarSize = 120;
  const avatarX = 40;
  const avatarY = (200 - avatarSize) / 2;

  try {
    const avatar = await loadImage(data.avatarUrl);
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
    ctx.restore();
  } catch {
    // ignore
  }

  const infoX = avatarX + avatarSize + 30;

  ctx.fillStyle = "#FFFFFF";
  ctx.font = `bold 28px ${FONT}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(truncate(ctx, data.username || "User", 300), infoX, 50);

  ctx.font = `bold 16px ${FONT}`;
  ctx.fillStyle = "#8E9297";
  ctx.fillText(`المستوى: ${data.level ?? 0}`, infoX, 80);
  ctx.fillText(`الترتيب: #${data.serverRank ?? 1}`, infoX, 105);

  const progressBarY = 140;
  const progressBarWidth = 500;
  const progressBarHeight = 20;
  const progress = data.maxExp > 0 ? Math.min(Math.max(data.currentExp / data.maxExp, 0), 1) : 0;

  ctx.fillStyle = "#1A1C23";
  drawRoundedRect(ctx, infoX, progressBarY, progressBarWidth, progressBarHeight, 10);
  ctx.fill();

  if (progress > 0) {
    const calculatedWidth = Math.max(progressBarWidth * progress, 15);
    ctx.fillStyle = "#F1E0C5";
    drawRoundedRect(ctx, infoX, progressBarY, calculatedWidth, progressBarHeight, 10);
    ctx.fill();
  }

  ctx.fillStyle = "#FFFFFF";
  ctx.font = `bold 14px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`${data.currentExp ?? 0} / ${data.maxExp ?? 0} XP`, infoX + progressBarWidth / 2, progressBarY + 10);

  return canvas.toBuffer("image/png");
}
