import { GlobalFonts } from "@napi-rs/canvas";
import fs from "fs";
import path from "path";
import { logError } from "./logger";

let isFontRegistered = false;

/**
 * يضمن تحميل خط Cairo من الملف المحلي (fonts/Cairo-Bold.ttf) أو عبر الشبكة
 * كبديل، ثم يعيد اسم العائلة المسجلة. نفْس الخط المستخدم في بطاقات الرانك.
 */
export async function ensureFontLoaded(): Promise<string> {
  if (isFontRegistered) return "CairoFont";

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
      return "CairoFont";
    } catch (err) {
      logError("fonts-local", err);
    }
  }

  try {
    const fontUrl =
      "https://raw.githubusercontent.com/xhskabdvjdock/the-z/main/bot/fonts/Cairo-Bold.ttf";
    const res = await fetch(fontUrl);
    if (res.ok) {
      GlobalFonts.register(Buffer.from(await res.arrayBuffer()), "CairoFont");
      isFontRegistered = true;
      console.log("[Fonts] ✅ تم جلب الخط عبر الشبكة بنجاح!");
      return "CairoFont";
    }
    console.error(`[Fonts] ❌ فشل جلب الخط من GitHub RAW: HTTP ${res.status}`);
  } catch (err) {
    logError("fonts-network", err);
  }

  return "sans-serif";
}