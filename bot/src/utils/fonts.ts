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
    path.resolve(rootDir, "fonts", "Cairo-Bold.ttf"),
    path.resolve(rootDir, "bot", "fonts", "Cairo-Bold.ttf"),
    path.resolve(__dirname, "..", "..", "..", "fonts", "Cairo-Bold.ttf"),
    path.resolve(__dirname, "..", "..", "fonts", "Cairo-Bold.ttf"),
    path.resolve(__dirname, "..", "fonts", "Cairo-Bold.ttf")
  ];

  for (const fontPath of possiblePaths) {
    if (!fs.existsSync(fontPath)) continue;
    try {
      GlobalFonts.register(fs.readFileSync(fontPath), "CairoFont");
      isFontRegistered = true;
      console.log(`[Fonts] ✅ تم تحميل الخط محليًا من: ${fontPath}`);
      break;
    } catch (err) {
      logError("fonts-local", err);
    }
  }

  if (!isFontRegistered) {
    try {
      const fontUrl =
        "https://raw.githubusercontent.com/xhskabdvjdock/the-z/main/bot/fonts/Cairo-Bold.ttf";
      const res = await fetch(fontUrl);
      if (res.ok) {
        GlobalFonts.register(Buffer.from(await res.arrayBuffer()), "CairoFont");
        isFontRegistered = true;
        console.log("[Fonts] ✅ تم جلب الخط عبر الشبكة بنجاح!");
      } else {
        console.error(`[Fonts] ❌ فشل جلب الخط من GitHub RAW: HTTP ${res.status}`);
      }
    } catch (err) {
      logError("fonts-network", err);
    }
  }

  await ensureJpFontLoaded();
  return isFontRegistered ? '"CairoFont", "NotoJP", sans-serif' : '"NotoJP", sans-serif';
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