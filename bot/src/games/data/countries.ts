/** دول للألعاب (أعلام وأسماء) — الأعلام إيموجي يونيكود (محتوى لعبة) */
export interface Country {
  name: string;
  flag: string;
}

export const COUNTRIES: Country[] = [
  { name: "السعودية", flag: "🇸🇦" },
  { name: "مصر", flag: "🇪🇬" },
  { name: "الإمارات", flag: "🇦🇪" },
  { name: "قطر", flag: "🇶🇦" },
  { name: "الكويت", flag: "🇰🇼" },
  { name: "الأردن", flag: "🇯🇴" },
  { name: "لبنان", flag: "🇱🇧" },
  { name: "العراق", flag: "🇮🇶" },
  { name: "سوريا", flag: "🇸🇾" },
  { name: "اليمن", flag: "🇾🇪" },
  { name: "عُمان", flag: "🇴🇲" },
  { name: "البحرين", flag: "🇧🇭" },
  { name: "المغرب", flag: "🇲🇦" },
  { name: "الجزائر", flag: "🇩🇿" },
  { name: "تونس", flag: "🇹🇳" },
  { name: "ليبيا", flag: "🇱🇾" },
  { name: "السودان", flag: "🇸🇩" },
  { name: "الصومال", flag: "🇸🇴" },
  { name: "موريتانيا", flag: "🇲🇷" },
  { name: "الولايات المتحدة", flag: "🇺🇸" },
  { name: "المملكة المتحدة", flag: "🇬🇧" },
  { name: "فرنسا", flag: "🇫🇷" },
  { name: "ألمانيا", flag: "🇩🇪" },
  { name: "إيطاليا", flag: "🇮🇹" },
  { name: "إسبانيا", flag: "🇪🇸" },
  { name: "البرتغال", flag: "🇵🇹" },
  { name: "روسيا", flag: "🇷🇺" },
  { name: "تركيا", flag: "🇹🇷" },
  { name: "الصين", flag: "🇨🇳" },
  { name: "اليابان", flag: "🇯🇵" },
  { name: "كوريا الجنوبية", flag: "🇰🇷" },
  { name: "الهند", flag: "🇮🇳" },
  { name: "البرازيل", flag: "🇧🇷" },
  { name: "الأرجنتين", flag: "🇦🇷" },
  { name: "المكسيك", flag: "🇲🇽" },
  { name: "كندا", flag: "🇨🇦" },
  { name: "أستراليا", flag: "🇦🇺" },
  { name: "نيوزيلندا", flag: "🇳🇿" },
  { name: "اليونان", flag: "🇬🇷" },
  { name: "هولندا", flag: "🇳🇱" },
  { name: "السويد", flag: "🇸🇪" },
  { name: "النرويج", flag: "🇳🇴" },
  { name: "فنلندا", flag: "🇫🇮" },
  { name: "بولندا", flag: "🇵🇱" },
  { name: "سويسرا", flag: "🇨🇭" },
  { name: "بلجيكا", flag: "🇧🇪" },
  { name: "الدنمارك", flag: "🇩🇰" },
  { name: "النمسا", flag: "🇦🇹" }
];

export function randomCountry(exclude?: Set<string>): Country {
  const pool = COUNTRIES.filter((c) => !exclude || !exclude.has(c.name));
  return pool[Math.floor(Math.random() * pool.length)];
}