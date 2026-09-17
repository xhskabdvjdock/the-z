import { config } from "../config";
import { logError } from "./logger";

function fetchWithProxy(url: string, opts: RequestInit = {}) {
  const proxyUrl = process.env.HTTPS_PROXY || process.env.https_proxy || process.env.DISCORD_PROXY;
  if (proxyUrl) {
    try {
      // @ts-ignore - optional dependency
      const { HttpsProxyAgent } = require("https-proxy-agent");
      (opts as any).agent = new HttpsProxyAgent(proxyUrl);
    } catch {}
  }
  return fetch(url, opts);
}

/**
 * ترجمة نص باستخدام DeepL كأساسي وBing كاحتياطي.
 * تُستخدم من /translate و,tr لتوحيد السلوك.
 */
export async function translateText(text: string, targetLang: string): Promise<string | null> {
  const isArabic = /[\u0600-\u06FF]/.test(text);
  const input = text.slice(0, 1000);

  // DeepL أولاً (يُتخطّى تلقائيًا إذا لم يُضبط DEEPL_API_KEY)
  if (config.deeplApiKey) {
    try {
      const isFreeKey = config.deeplApiKey.endsWith(":fx");
      const deeplHost = isFreeKey ? "https://api-free.deepl.com" : "https://api.deepl.com";
      const res = await fetchWithProxy(`${deeplHost}/v2/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `DeepL-Auth-Key ${config.deeplApiKey}` },
        body: JSON.stringify({
          text: [input],
          source_lang: isArabic ? "AR" : "EN",
          target_lang: targetLang.toUpperCase()
        }),
        signal: AbortSignal.timeout(8000) as any
      });
      if (res.ok) {
        const data = (await res.json()) as any;
        const trans = data?.translations?.[0]?.text;
        if (trans?.trim()) return trans;
      }
    } catch (err) {
      logError("translate/deepl", err);
    }
  }

  // Bing كاحتياطي
  try {
    const { translate: bingTranslate } = await import("bing-translate-api");
    const result = await bingTranslate(input, isArabic ? "ar" : null, targetLang);
    if (result?.translation?.trim()) return result.translation;
  } catch (err) {
    logError("translate/bing", err);
  }

  return null;
}
