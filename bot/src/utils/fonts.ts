import { GlobalFonts } from "@napi-rs/canvas";
import fs from "fs";
import path from "path";
import { logError } from "./logger";

let isFontRegistered = false;
let isJpFontRegistered = false;

/**
 * يضمن تحميل خط Cairo و Noto Sans JP، ثم يعيد عائلة الخطوط.
 */
export async function ensureFontLoaded(): Promise<string> {
  if (isFontRegistered && isJpFontRegistered) return '"CairoFont", "NotoJP", sans-serif';
  if (isFontRegistered) {
    await ensureJpFontLoaded();
    return '"CairoFont", "NotoJP", sans-serif';
  }

  const rootDir = process.cwd();
  const possiblePaths = [
    path.resolve(rootDir, "fonts", "Rubik-Bold.ttf"),
    path.resolve(rootDir, "bot", "fonts", "Rubik-Bold.ttf"),
    path.resolve(__dirname, "..", "..", "..", "fonts", "Rubik-Bold.ttf"),
    path.resolve(__dirname, "..", "..", "fonts", "Rubik-Bold.ttf"),
    path.resolve(__dirname, "..", "fonts", "Rubik-Bold.ttf")
  ];

  for (const fontPath of possiblePaths) {
    if (!fs.existsSync(fontPath)) continue;
    try {
      GlobalFonts.register(fs.readFileSync(fontPath), "Rubik");
      isFontRegistered = true;
      console.log(`[Fonts] ✅ تم تحميل Rubik محليًا من: ${fontPath}`);
      break;
    } catch (err) {
      logError("fonts-local", err);
    }
  }

  if (!isFontRegistered) {
    try {
      const fontUrl = "https://raw.githubusercontent.com/google/fonts/main/ofl/rubik/Rubik-Bold.ttf";
      const res = await fetch(fontUrl);
      if (res.ok) {
        GlobalFonts.register(Buffer.from(await res.arrayBuffer()), "Rubik");
        isFontRegistered = true;
        console.log("[Fonts] ✅ تم جلب Rubik عبر الشبكة بنجاح!");
      } else {
        console.error(`[Fonts] ❌ فشل جلب Rubik من GitHub: HTTP ${res.status}`);
      }
    } catch (err) {
      logError("fonts-network", err);
    }
  }

  await ensureJpFontLoaded();
  return isFontRegistered ? '"Rubik", "NotoJP", sans-serif' : '"NotoJP", sans-serif';
}

async function ensureJpFontLoaded(): Promise<void> {
  if (isJpFontRegistered) return;
  const fontUrl = "https://raw.githubusercontent.com/google/fonts/main/ofl/notosansjp/NotoSansJP-Bold.ttf";
  try {
    const res = await fetch(fontUrl);
    if (res.ok) {
      GlobalFonts.register(Buffer.from(await res.arrayBuffer()), "NotoJP");
      isJpFontRegistered = true;
      console.log("[Fonts] ✅ تم تحميل Noto Sans JP");
    }
  } catch (err) {
    logError("fonts-jp", err);
  }
}