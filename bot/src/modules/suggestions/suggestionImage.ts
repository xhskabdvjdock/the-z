import { createCanvas, loadImage } from "@napi-rs/canvas";
import { ensureFontLoaded } from "../../utils/fonts";

export interface SuggestionImageOptions {
  backgroundUrl?: string;
}

/**
 * يولّد صورة اقتراح تحتوي على نص الاقتراح ومعلومات المرسل
 */
export async function generateSuggestionImage(
  user: { username: string; tag: string; avatarURL: string },
  content: string,
  options: SuggestionImageOptions = {}
): Promise<Buffer> {
  const width = 1000;
  const height = 500;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  const fontName = await ensureFontLoaded();

  // الخلفية
  let hasBackgroundImage = false;
  if (options.backgroundUrl && (options.backgroundUrl.startsWith("data:image/") || /^https?:\/\//i.test(options.backgroundUrl))) {
    try {
      const bgImage = await loadImage(options.backgroundUrl);
      const scale = Math.max(width / bgImage.width, height / bgImage.height);
      const dw = bgImage.width * scale;
      const dh = bgImage.height * scale;
      ctx.drawImage(bgImage, (width - dw) / 2, (height - dh) / 2, dw, dh);
      hasBackgroundImage = true;
    } catch {
      hasBackgroundImage = false;
    }
  }

  if (!hasBackgroundImage) {
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#1e1b4b");
    gradient.addColorStop(0.5, "#312e81");
    gradient.addColorStop(1, "#5865f2");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  // تعتيم للقراءة
  ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
  ctx.fillRect(0, 0, width, height);

  // إطار داخلي
  ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
  ctx.lineWidth = 2;
  ctx.strokeRect(20, 20, width - 40, height - 40);

  // الصورة الرمزية
  const avatarSize = 90;
  const avatarX = 50;
  const avatarY = 40;
  try {
    const avatarImage = await loadImage(user.avatarURL);
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatarImage, avatarX, avatarY, avatarSize, avatarSize);
    ctx.restore();

    // حدود الصورة
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    ctx.stroke();
  } catch {
    // تجاهل
  }

  // اسم المستخدم
  ctx.textAlign = "left";
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold 28px "${fontName}"`;
  ctx.fillText(user.username, avatarX + avatarSize + 20, avatarY + 35);

  // التاج
  ctx.fillStyle = "#b9bbbe";
  ctx.font = `18px "${fontName}"`;
  ctx.fillText(user.tag, avatarX + avatarSize + 20, avatarY + 65);

  // عنوان الاقتراح
  ctx.fillStyle = "#5865f2";
  ctx.font = `bold 22px "${fontName}"`;
  ctx.textAlign = "center";
  ctx.fillText("اقتراح جديد", width / 2, avatarY + avatarSize + 50);

  // نص الاقتراح مع التفاف
  ctx.fillStyle = "#ffffff";
  ctx.font = `24px "${fontName}"`;
  ctx.textAlign = "center";

  const maxWidth = width - 100;
  const lineHeight = 36;
  const words = content.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);

  // عرض 4 أسطر كحد أقصى
  const displayLines = lines.slice(0, 4);
  if (lines.length > 4) {
    displayLines[3] = displayLines[3].slice(0, -3) + "...";
  }

  const startY = avatarY + avatarSize + 100;
  displayLines.forEach((line, i) => {
    ctx.fillText(line, width / 2, startY + i * lineHeight);
  });

  // خط فاصل
  ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(100, height - 60);
  ctx.lineTo(width - 100, height - 60);
  ctx.stroke();

  // تذييل
  ctx.fillStyle = "#b9bbbe";
  ctx.font = `16px "${fontName}"`;
  ctx.textAlign = "center";
  ctx.fillText("استخدم الأزرار أدناه للتصويت", width / 2, height - 30);

  return canvas.encode("png");
}