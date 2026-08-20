/** قوالب الألوان لنظام ألوان الاسم — 10 قوالب × 10 ألوان (درجات مدروسة من الفاتح للداكن) */

export interface ColorTemplateColor {
  /** HEX بدون # */
  hex: string;
}

export interface ColorTemplate {
  id: string;
  name: string;
  description: string;
  colors: ColorTemplateColor[];
}

/** معرّف القالب المخصص: المستخدم يختار ألوانه من باقي القوالب */
export const CUSTOM_TEMPLATE_ID = "custom";

export const COLOR_TEMPLATES: ColorTemplate[] = [
  {
    id: "mono",
    name: "أبيض وأسود",
    description: "تدرجات الأبيض والأسود البارد",
    colors: [
      { hex: "F8FAFC" }, { hex: "F1F5F9" }, { hex: "E2E8F0" }, { hex: "CBD5E1" },
      { hex: "94A3B8" }, { hex: "64748B" }, { hex: "475569" }, { hex: "334155" },
      { hex: "1E293B" }, { hex: "020617" }
    ]
  },
  {
    id: "gray",
    name: "رمادي دافئ",
    description: "تدرجات الرمادي الدافئ",
    colors: [
      { hex: "FAFAF9" }, { hex: "F5F5F4" }, { hex: "E7E5E4" }, { hex: "D6D3D1" },
      { hex: "A8A29E" }, { hex: "78716C" }, { hex: "57534E" }, { hex: "44403C" },
      { hex: "292524" }, { hex: "0C0A09" }
    ]
  },
  {
    id: "red",
    name: "أحمر",
    description: "تدرجات الأحمر",
    colors: [
      { hex: "FEF2F2" }, { hex: "FEE2E2" }, { hex: "FECACA" }, { hex: "FCA5A5" },
      { hex: "F87171" }, { hex: "EF4444" }, { hex: "DC2626" }, { hex: "B91C1C" },
      { hex: "991B1B" }, { hex: "450A0A" }
    ]
  },
  {
    id: "orange",
    name: "برتقالي",
    description: "تدرجات البرتقالي",
    colors: [
      { hex: "FFF7ED" }, { hex: "FFEDD5" }, { hex: "FED7AA" }, { hex: "FDBA74" },
      { hex: "FB923C" }, { hex: "F97316" }, { hex: "EA580C" }, { hex: "C2410C" },
      { hex: "9A3412" }, { hex: "431407" }
    ]
  },
  {
    id: "yellow",
    name: "كهرماني",
    description: "تدرجات الأصفر الكهرماني",
    colors: [
      { hex: "FFFBEB" }, { hex: "FEF3C7" }, { hex: "FDE68A" }, { hex: "FCD34D" },
      { hex: "FBBF24" }, { hex: "F59E0B" }, { hex: "D97706" }, { hex: "B45309" },
      { hex: "92400E" }, { hex: "451A03" }
    ]
  },
  {
    id: "green",
    name: "أخضر",
    description: "تدرجات الأخضر",
    colors: [
      { hex: "F0FDF4" }, { hex: "DCFCE7" }, { hex: "BBF7D0" }, { hex: "86EFAC" },
      { hex: "4ADE80" }, { hex: "22C55E" }, { hex: "16A34A" }, { hex: "15803D" },
      { hex: "166534" }, { hex: "052E16" }
    ]
  },
  {
    id: "teal",
    name: "تركواز",
    description: "تدرجات التركواز والسماوي",
    colors: [
      { hex: "F0FDFA" }, { hex: "CCFBF1" }, { hex: "99F6E4" }, { hex: "5EEAD4" },
      { hex: "2DD4BF" }, { hex: "14B8A6" }, { hex: "0D9488" }, { hex: "0F766E" },
      { hex: "115E59" }, { hex: "042F2E" }
    ]
  },
  {
    id: "blue",
    name: "أزرق",
    description: "تدرجات الأزرق",
    colors: [
      { hex: "EFF6FF" }, { hex: "DBEAFE" }, { hex: "BFDBFE" }, { hex: "93C5FD" },
      { hex: "60A5FA" }, { hex: "3B82F6" }, { hex: "2563EB" }, { hex: "1D4ED8" },
      { hex: "1E40AF" }, { hex: "172554" }
    ]
  },
  {
    id: "purple",
    name: "بنفسجي",
    description: "تدرجات البنفسجي",
    colors: [
      { hex: "F5F3FF" }, { hex: "EDE9FE" }, { hex: "DDD6FE" }, { hex: "C4B5FD" },
      { hex: "A78BFA" }, { hex: "8B5CF6" }, { hex: "7C3AED" }, { hex: "6D28D9" },
      { hex: "5B21B6" }, { hex: "2E1065" }
    ]
  },
  {
    id: "pink",
    name: "وردي",
    description: "تدرجات الوردي",
    colors: [
      { hex: "FDF2F8" }, { hex: "FCE7F3" }, { hex: "FBCFE8" }, { hex: "F9A8D4" },
      { hex: "F472B6" }, { hex: "EC4899" }, { hex: "DB2777" }, { hex: "BE185D" },
      { hex: "9D174D" }, { hex: "500724" }
    ]
  }
];

/** اسم رتبة اللون داخل القالب: "أحمر 3" / "مخصص 1" */
export function colorRoleName(templateName: string, index: number): string {
  return `${templateName} ${index + 1}`;
}

/** يجمع كل ألوان القوالب العشرة (لاختيار القالب المخصص) */
export function allTemplateColors(): { hex: string; templateName: string }[] {
  return COLOR_TEMPLATES.flatMap((t) =>
    t.colors.map((c) => ({ hex: c.hex, templateName: t.name }))
  );
}