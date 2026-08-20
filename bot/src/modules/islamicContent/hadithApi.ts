import { HADITH_BOOK_NAMES, HADITH_MAX_NUMBERS } from "@thez/shared";

const HADITH_API_BASE = "https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1";

export interface FetchedHadith {
  number: number;
  text: string;
}

/**
 * جلب نص حديث بالعربية مباشرة من مصدر بيانات islam.js (fawazahmed0/hadith-api).
 *
 * ملاحظة معروفة: كائن `Hadith` داخل islam.js@1.3.0 معطوب في الواقع — mapper داخلي
 * يتوقع أسماء حقول قديمة (metadata.section_details / metadata.sections) بينما الاستجابة
 * الفعلية للـ API تعيد (metadata.section_detail / metadata.section) مما يرمي
 * "Cannot read properties of undefined (reading 'arabicnumber_first')".
 * الحل: الجلب من نفس الـ CDN الذي تعتمد عليه المكتبة وبالصيغة نفسها،
 * والاستخدام الحصري للكتابين المسموحين فقط (صحيح البخاري / صحيح مسلم).
 */
export async function fetchHadith(
  source: string,
  hadithNo: number
): Promise<FetchedHadith | null> {
  if (!HADITH_BOOK_NAMES[source]) return null;
  const max = HADITH_MAX_NUMBERS[source] ?? 7563;
  const number = Math.min(Math.max(1, hadithNo), max);
  const slug = source === "Muslim" ? "ara-muslim" : "ara-bukhari";
  try {
    const res = await fetch(`${HADITH_API_BASE}/editions/${slug}/${number}.json`);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      metadata?: { name?: string };
      hadiths?: { hadithnumber?: number | string; text?: string }[];
    };
    const hadith = data?.hadiths?.[0];
    if (!hadith?.text) return null;
    return {
      number: Number(hadith.hadithnumber ?? number),
      text: String(hadith.text)
    };
  } catch {
    return null;
  }
}