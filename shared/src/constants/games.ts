/**
 * بيانات وصفية لألعاب The Z — تُستخدم في لوحة التحكم (الداشبورد) لعرض كل لعبة
 * وتوليد الإعدادات الافتراضية. الـ Registry في البوت هو مصدر الحقيقة الفعلي
 * للسلوك؛ أسماء هذه اللعبات (name) مطابقة لاسم كل لعبة في الـ Registry.
 */

export interface IGameMeta {
  /** اسم اللعبة في الـ Registry (مثل xo، mafia، game2048) */
  name: string;
  title: string;
  category: "multiplayer" | "singleplayer";
  description: string;
  minPlayers: number;
  maxPlayers: number;
  durationLabel: string;
  /** أمر البادئة للعب، مثل -xo */
  prefix: string;
}

export const GAMES: IGameMeta[] = [
  // ───── الألعاب الجماعية ─────
  {
    name: "xo",
    title: "XO",
    category: "multiplayer",
    description: "لعبة XO الكلاسيكية — اثنان فقط، من يخطّ ثلاثة أولًا؟",
    minPlayers: 2,
    maxPlayers: 2,
    durationLabel: "دقيقتان",
    prefix: "-xo"
  },
  {
    name: "rps",
    title: "RPS",
    category: "multiplayer",
    description: "حجر ورقة مقص — أفضل من جولتين.",
    minPlayers: 2,
    maxPlayers: 2,
    durationLabel: "دقيقة",
    prefix: "-rps"
  },
  {
    name: "roulette",
    title: "روليت",
    category: "multiplayer",
    description: "روليت الأرقام — الجميع يختارون رقمًا والفائز من يصيب.",
    minPlayers: 2,
    maxPlayers: 10,
    durationLabel: "دقيقتان",
    prefix: "-roulette"
  },
  {
    name: "quickdraw",
    title: "الرد السريع",
    category: "multiplayer",
    description: "أسرع من يضغط الزر يربح الجولة.",
    minPlayers: 2,
    maxPlayers: 10,
    durationLabel: "دقيقة",
    prefix: "-quickdraw"
  },
  {
    name: "numberwar",
    title: "حرب الأرقام",
    category: "multiplayer",
    description: "اختر رقمًا — من يُطابق أكثر يحصد نقاطًا.",
    minPlayers: 2,
    maxPlayers: 10,
    durationLabel: "3 دقائق",
    prefix: "-numberwar"
  },
  {
    name: "highlow",
    title: "عالٍ أم منخفض",
    category: "multiplayer",
    description: "خمّن إذا كان الرقم التالي أعلى أم أقل.",
    minPlayers: 2,
    maxPlayers: 8,
    durationLabel: "3 دقائق",
    prefix: "-highlow"
  },
  {
    name: "truthordare",
    title: "حقيقة أم جرأة",
    category: "multiplayer",
    description: "اختر حقيقة أو جرأة ودع البوت يقرر.",
    minPlayers: 2,
    maxPlayers: 20,
    durationLabel: "10 دقائق",
    prefix: "-truthordare"
  },
  {
    name: "flags",
    title: "أعلام",
    category: "multiplayer",
    description: "من يعرف علم الدولة أولًا؟",
    minPlayers: 2,
    maxPlayers: 10,
    durationLabel: "3 دقائق",
    prefix: "-flags"
  },
  {
    name: "hangman",
    title: "حبل الغسيل",
    category: "multiplayer",
    description: "خمّن الحروف قبل اكتمال الرسم — كلمة سر لكل جولة.",
    minPlayers: 2,
    maxPlayers: 10,
    durationLabel: "5 دقائق",
    prefix: "-hangman كلمة"
  },
  {
    name: "connect4",
    title: "أربعة في صف",
    category: "multiplayer",
    description: "وصّل أربعة قبل خصمك — للاعبين اثنين.",
    minPlayers: 2,
    maxPlayers: 2,
    durationLabel: "5 دقائق",
    prefix: "-connect4"
  },
  {
    name: "guessnumber",
    title: "خمّن الرقم",
    category: "multiplayer",
    description: "الجميع يكتبون تخمينات — أقرب رقم يفوز.",
    minPlayers: 2,
    maxPlayers: 10,
    durationLabel: "3 دقائق",
    prefix: "-guessnumber"
  },
  {
    name: "mafia",
    title: "المافيا",
    category: "multiplayer",
    description: "لعبة الغموض والتحالفات — المافيا تقتل بالليل والمدينة تحقق بالنهار.",
    minPlayers: 5,
    maxPlayers: 15,
    durationLabel: "10-20 دقيقة",
    prefix: "-mafia"
  },

  // ───── الألعاب الفردية ─────
  {
    name: "button",
    title: "زر",
    category: "singleplayer",
    description: "اضغط الزر حين يتحول للون الأخضر — كسب النقاط قبل انتهاء الوقت.",
    minPlayers: 1,
    maxPlayers: 1,
    durationLabel: "دقيقة",
    prefix: "-button"
  },
  {
    name: "faster",
    title: "أسرع",
    category: "singleplayer",
    description: "اضغط الزر الذي يتوهج — كلما أسرعت زادت النقاط.",
    minPlayers: 1,
    maxPlayers: 1,
    durationLabel: "دقيقتان",
    prefix: "-faster"
  },
  {
    name: "memory",
    title: "ذاكرة",
    category: "singleplayer",
    description: "اقلب البطاقات وطابق الأزواج بأقل عدد محاولات.",
    minPlayers: 1,
    maxPlayers: 1,
    durationLabel: "3 دقائق",
    prefix: "-memory"
  },
  {
    name: "math",
    title: "حساب",
    category: "singleplayer",
    description: "حل المسائل الحسابية قبل انتهاء الوقت.",
    minPlayers: 1,
    maxPlayers: 1,
    durationLabel: "دقيقتان",
    prefix: "-math"
  },
  {
    name: "simon",
    title: "سايمون",
    category: "singleplayer",
    description: "كرر تسلسل الألوان المتنامي — إلى أين تصل؟",
    minPlayers: 1,
    maxPlayers: 1,
    durationLabel: "3-5 دقائق",
    prefix: "-simon"
  },
  {
    name: "reaction",
    title: "زمن رد الفعل",
    category: "singleplayer",
    description: "اضغط في أسرع وقت بعد ظهور الإشارة.",
    minPlayers: 1,
    maxPlayers: 1,
    durationLabel: "10 ثوانٍ",
    prefix: "-reaction"
  },
  {
    name: "typing",
    title: "طباعة",
    category: "singleplayer",
    description: "اكتب الجملة بأسرع وقت ودقة كاملة.",
    minPlayers: 1,
    maxPlayers: 1,
    durationLabel: "30 ثانية",
    prefix: "-typing"
  },
  {
    name: "morefaster",
    title: "أسرع وأسرع",
    category: "singleplayer",
    description: "اكتب الكلمات بوتيرة متصاعدة — الوقت يتقلص كل جولة.",
    minPlayers: 1,
    maxPlayers: 1,
    durationLabel: "دقيقة",
    prefix: "-morefaster"
  },
  {
    name: "colortile",
    title: "بلاطة اللون",
    category: "singleplayer",
    description: "انتبه للألوان — اضغط الزر الذي لونه يطابق الكلمة.",
    minPlayers: 1,
    maxPlayers: 1,
    durationLabel: "دقيقة ونصف",
    prefix: "-colortile"
  },
  {
    name: "scramble",
    title: "فك الترميز",
    category: "singleplayer",
    description: "رتب الحروف المبعثرة لتكوّن الكلمة الصحيحة.",
    minPlayers: 1,
    maxPlayers: 1,
    durationLabel: "دقيقتان",
    prefix: "-scramble"
  },
  {
    name: "trivia",
    title: "أسئلة",
    category: "singleplayer",
    description: "اختبر معلوماتك العامة — 10 أسئلة بأربعة خيارات.",
    minPlayers: 1,
    maxPlayers: 1,
    durationLabel: "4 دقائق",
    prefix: "-trivia"
  },
  {
    name: "game2048",
    title: "2048",
    category: "singleplayer",
    description: "ادمج الأرقام المتطابقة حتى تصل إلى 2048.",
    minPlayers: 1,
    maxPlayers: 1,
    durationLabel: "5 دقائق",
    prefix: "-2048"
  }
];

export function getGameMeta(name: string): IGameMeta | undefined {
  return GAMES.find((g) => g.name === name);
}

/** برودة اللعب الافتراضية (ثوانٍ) لكل لعبة — تطابق cooldownSeconds في تعريفات البوت */
export const GAME_COOLDOWNS: Record<string, number> = {
  mafia: 30,
  roulette: 5,
  trivia: 5
};

export function getGameCooldown(name: string): number {
  return GAME_COOLDOWNS[name] ?? 3;
}

export function getDefaultGameOverride(name: string) {
  return {
    name,
    enabled: true,
    cooldownSeconds: undefined as number | undefined,
    allowedChannelIds: [] as string[]
  };
}