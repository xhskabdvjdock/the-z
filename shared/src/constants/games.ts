export const GAMES_LIST = [
  { id: "roulette", name: "روليت", nameEn: "roulette", description: "لعبة الروليت الجماعية", category: "جماعية" },
  { id: "xo", name: "اكس او", nameEn: "xo", description: "لعبة X/O", category: "جماعية" },
  { id: "mafia", name: "مافيا", nameEn: "mafia", description: "لعبة المافيا", category: "جماعية" },
  { id: "chairs", name: "كراسي", nameEn: "chairs", description: "لعبة الكراسي", category: "جماعية" },
  { id: "rps", name: "حجرة", nameEn: "rps", description: "حجرة ورقة مقص", category: "جماعية" },
  { id: "dice", name: "نرد", nameEn: "dice", description: "رمي النرد", category: "جماعية" },
  { id: "wheel", name: "عجلة", nameEn: "wheel", description: "عجلة الحظ", category: "جماعية" },
  { id: "hotxo", name: "hotxo", nameEn: "hotxo", description: "لعبة Hot XO", category: "جماعية" },
  { id: "hide", name: "غميضة", nameEn: "hide", description: "لعبة الغميضة", category: "جماعية" },
  { id: "replica", name: "ريبلكا", nameEn: "replica", description: "لعبة الريبلكا", category: "جماعية" },
  { id: "guess", name: "خمن", nameEn: "guess", description: "خمن الرقم/الكلمة", category: "جماعية" },
  { id: "draw", name: "رسمة", nameEn: "draw", description: "تحدي الرسم", category: "جماعية" },
  { id: "button", name: "زر", nameEn: "button", description: "اضغط الزر", category: "فردية" },
  { id: "fast", name: "اسرع", nameEn: "fast", description: "الأسرع يكسب", category: "فردية" },
  { id: "unscramble", name: "فكك", nameEn: "unscramble", description: "فكك الكلمة", category: "فردية" },
  { id: "merge", name: "ادمج", nameEn: "merge", description: "ادمج الحروف", category: "فردية" },
  { id: "flags", name: "اعلام", nameEn: "flags", description: "خمن العلم", category: "فردية" },
  { id: "reverse", name: "اعكس", nameEn: "reverse", description: "اعكس الجملة", category: "فردية" },
  { id: "letter", name: "حرف", nameEn: "letter", description: "خمن الحرف", category: "فردية" },
  { id: "correct", name: "صحح", nameEn: "correct", description: "صحح الجملة", category: "فردية" },
  { id: "order", name: "ترتيب", nameEn: "order", description: "رتب الكلمات", category: "فردية" },
  { id: "colors", name: "الوان", nameEn: "colors", description: "خمن اللون", category: "فردية" },
  { id: "emoji", name: "ايموجي", nameEn: "emoji", description: "خمن الايموجي", category: "فردية" },
  { id: "reveal", name: "اكشف", nameEn: "reveal", description: "اكشف الصورة", category: "فردية" }
] as const;

export type GameId = typeof GAMES_LIST[number]["id"];