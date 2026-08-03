import { createCanvas, loadImage, GlobalFonts, SKRSContext2D } from "@napi-rs/canvas";
import { GuildMember } from "discord.js";
import fs from "fs";
import path from "path";

let isFontRegistered = false;

async function ensureFontLoaded(): Promise<void> {
  if (isFontRegistered) return;

  // 1. تجربة جميع المسارات المحتملة لمجلد fonts داخل وخارج dist
  const rootDir = process.cwd();
  const possiblePaths = [
    path.resolve(rootDir, "fonts", "Cairo-Bold.ttf"),
    path.resolve(rootDir, "bot", "fonts", "Cairo-Bold.ttf"),
    path.resolve(__dirname, "..", "..", "..", "fonts", "Cairo-Bold.ttf"),
    path.resolve(__dirname, "..", "..", "fonts", "Cairo-Bold.ttf"),
    path.resolve(__dirname, "..", "fonts", "Cairo-Bold.ttf")
  ];

  for (const fontPath of possiblePaths) {
    if (fs.existsSync(fontPath)) {
      try {
        const fontBuffer = fs.readFileSync(fontPath);
        GlobalFonts.register(fontBuffer, "CairoFont");
        isFontRegistered = true;
        console.log(`[RankCard] ✅ تم تحميل الخط بنجاح محلياً من: ${fontPath}`);
        return;
      } catch (err) {
        console.error(`[RankCard] ❌ فشل قراءة الخط محلياً من ${fontPath}:`, err);
      }
    }
  }

  // 2. إذا فشلت كل المسارات المحلية، نجلب الملف فوراً عبر الشبكة من GitHub RAW
  try {
    console.log("[RankCard] 🔄 جاري تحميل الخط مباشرة من GitHub RAW...");
    const fontUrl = "https://raw.githubusercontent.com/xhskabdvjdock/the-z/main/bot/fonts/Cairo-Bold.ttf";
    const res = await fetch(fontUrl);
    if (res.ok) {
      const arrayBuffer = await res.arrayBuffer();
      const fontBuffer = Buffer.from(arrayBuffer);
      GlobalFonts.register(fontBuffer, "CairoFont");
      isFontRegistered = true;
      console.log("[RankCard] ✅ تم جلب الخط وتحقينه بنجاح عبر الشبكة!");
    } else {
      console.error(`[RankCard] ❌ فشل جلب الخط من GitHub RAW: HTTP ${res.status}`);
    }
  } catch (err) {
    console.error("[RankCard] ❌ خطأ في جلب الخط عبر الشبكة:", err);
  }
}

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
  await ensureFontLoaded();

  const fontName = isFontRegistered ? "CairoFont" : "sans-serif";
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");

  // 1. الخلفية الأساسية
  ctx.fillStyle = "#121318";
  drawRoundedRect(ctx, 0, 0, WIDTH, HEIGHT, 12);
  ctx.fill();

  // 2. إطار خارجي
  ctx.strokeStyle = "#2A2D37";
  ctx.lineWidth = 1;
  drawRoundedRect(ctx, 0.5, 0.5, WIDTH - 1, HEIGHT - 1, 12);
  ctx.stroke();

  // 3. الأفاتار
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
    // تجاهل أخطاء الأفاتار
  }

  const infoX = avatarX + avatarSize + 30;

  // 4. اسم المستخدم
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `28px "${fontName}"`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(truncate(ctx, member.displayName || "User", 300), infoX, 35);

  // 5. العناوين (Labels)
  ctx.font = `12px "${fontName}"`;
  ctx.fillStyle = "#8E9297";
  const labelY = 85;
  ctx.fillText("SERVER RANK", infoX, labelY);
  ctx.fillText("WEEKLY RANK", infoX + 140, labelY);
  ctx.fillText("WEEKLY EXP", infoX + 280, labelY);

  // 6. القيم (Values)
  ctx.font = `18px "${fontName}"`;
  ctx.fillStyle = "#FFFFFF";
  const valueY = labelY + 22;
  ctx.fillText(`#${data.rank ?? 1}`, infoX, valueY);
  ctx.fillText("Off", infoX + 140, valueY);
  ctx.fillText("0", infoX + 280, valueY);

  // 7. شريط التقدم
  const progressBarY = HEIGHT - 20;
  const progressBarHeight = 6;
  const progress = data.neededXp > 0 ? Math.min(Math.max(data.currentXp / data.neededXp, 0), 1) : 0;

  ctx.fillStyle = "#1A1C23";
  ctx.fillRect(40, progressBarY, leftPanelWidth - 60, progressBarHeight);

  if (progress > 0) {
    ctx.fillStyle = "#F1E0C5";
    ctx.fillRect(40, progressBarY, (leftPanelWidth - 60) * progress, progressBarHeight);
  }

  // 8. اللوحة اليمنى
  const rightPanelX = leftPanelWidth;
  const rightPanelWidth = WIDTH - leftPanelWidth;

  ctx.fillStyle = "#2A2D37";
  ctx.fillRect(rightPanelX - 1, 20, 1, HEIGHT - 40);

  // === صندوق LEVEL ===
  const levelBoxY = 25;
  ctx.fillStyle = "#1A1C23";
  drawRoundedRect(ctx, rightPanelX + 20, levelBoxY, rightPanelWidth - 40, 75, 8);
  ctx.fill();

  ctx.font = `11px "${fontName}"`;
  ctx.fillStyle = "#8E9297";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("LEVEL", rightPanelX + 32, levelBoxY + 8);

  const levelInnerBoxY = levelBoxY + 28;
  ctx.fillStyle = "#000000";
  drawRoundedRect(ctx, rightPanelX + 30, levelInnerBoxY, rightPanelWidth - 60, 35, 6);
  ctx.fill();

  ctx.font = `20px "${fontName}"`;
  ctx.fillStyle = "#FFFFFF";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`${data.level ?? 0}`, rightPanelX + rightPanelWidth / 2, levelInnerBoxY + 17.5);

  // === صندوق EXP ===
  const expBoxY = levelBoxY + 90;
  ctx.fillStyle = "#1A1C23";
  drawRoundedRect(ctx, rightPanelX + 20, expBoxY, rightPanelWidth - 40, 75, 8);
  ctx.fill();

  ctx.font = `11px "${fontName}"`;
  ctx.fillStyle = "#8E9297";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("EXP", rightPanelX + 32, expBoxY + 8);

  const expInnerBoxY = expBoxY + 28;
  ctx.fillStyle = "#000000";
  drawRoundedRect(ctx, rightPanelX + 30, expInnerBoxY, rightPanelWidth - 60, 35, 6);
  ctx.fill();

  ctx.font = `14px "${fontName}"`;
  ctx.fillStyle = "#FFFFFF";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`${data.currentXp ?? 0} / ${data.neededXp ?? 0}`, rightPanelX + rightPanelWidth / 2, expInnerBoxY + 17.5);

  return canvas.toBuffer("image/png");
}

export async function generateSimpleRankCard(data: NewRankCardData): Promise<Buffer> {
  await ensureFontLoaded();

  const fontName = isFontRegistered ? "CairoFont" : "sans-serif";
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
  ctx.font = `28px "${fontName}"`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(truncate(ctx, data.username || "User", 300), infoX, 35);

  ctx.font = `16px "${fontName}"`;
  ctx.fillStyle = "#8E9297";
  ctx.fillText(`المستوى: ${data.level ?? 0}`, infoX, 75);
  ctx.fillText(`الترتيب: #${data.serverRank ?? 1}`, infoX, 100);

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
  ctx.font = `14px "${fontName}"`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`${data.currentExp ?? 0} / ${data.maxExp ?? 0} XP`, infoX + progressBarWidth / 2, progressBarY + 10);

  return canvas.toBuffer("image/png");
}