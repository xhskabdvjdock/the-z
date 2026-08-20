/** قوالب الألوان لنظام ألوان الاسم — 10 قوالب × 10 ألوان (تدرج من الفاتح للداكن) */

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
    description: "تدرجات الأبيض والأسود",
    colors: [
      { hex: "FFFFFF" }, { hex: "E6E6E6" }, { hex: "CCCCCC" }, { hex: "B3B3B3" },
      { hex: "999999" }, { hex: "808080" }, { hex: "666666" }, { hex: "4D4D4D" },
      { hex: "333333" }, { hex: "1A1A1A" }
    ]
  },
  {
    id: "gray",
    name: "رمادي",
    description: "تدرجات الرمادي",
    colors: [
      { hex: "F5F5F5" }, { hex: "E0E0E0" }, { hex: "C9C9C9" }, { hex: "B0B0B0" },
      { hex: "989898" }, { hex: "7E7E7E" }, { hex: "646464" }, { hex: "4A4A4A" },
      { hex: "303030" }, { hex: "161616" }
    ]
  },
  {
    id: "red",
    name: "أحمر",
    description: "تدرجات الأحمر",
    colors: [
      { hex: "FF8080" }, { hex: "FF6B6B" }, { hex: "FF4D4D" }, { hex: "FF3333" },
      { hex: "FF1A1A" }, { hex: "FF0000" }, { hex: "E60000" }, { hex: "CC0000" },
      { hex: "B30000" }, { hex: "990000" }
    ]
  },
  {
    id: "orange",
    name: "برتقالي",
    description: "تدرجات البرتقالي",
    colors: [
      { hex: "FFD9B3" }, { hex: "FFC080" }, { hex: "FFA64D" }, { hex: "FF8C1A" },
      { hex: "FF7A00" }, { hex: "E66E00" }, { hex: "CC6100" }, { hex: "B35500" },
      { hex: "994900" }, { hex: "804000" }
    ]
  },
  {
    id: "yellow",
    name: "أصفر",
    description: "تدرجات الأصفر",
    colors: [
      { hex: "FFFF99" }, { hex: "FFFF66" }, { hex: "FFFF33" }, { hex: "FFFF00" },
      { hex: "E6E600" }, { hex: "CCCC00" }, { hex: "B3B300" }, { hex: "999900" },
      { hex: "808000" }, { hex: "666600" }
    ]
  },
  {
    id: "green",
    name: "أخضر",
    description: "تدرجات الأخضر",
    colors: [
      { hex: "B3FFB3" }, { hex: "80FF80" }, { hex: "4DFF4D" }, { hex: "1AFF1A" },
      { hex: "00FF00" }, { hex: "00E600" }, { hex: "00CC00" }, { hex: "00B300" },
      { hex: "009900" }, { hex: "008000" }
    ]
  },
  {
    id: "teal",
    name: "سماوي / تركواز",
    description: "تدرجات السماوي والتركواز",
    colors: [
      { hex: "B3FFFF" }, { hex: "80FFFF" }, { hex: "4DFFFF" }, { hex: "1AFFFF" },
      { hex: "00FFFF" }, { hex: "00E6E6" }, { hex: "00CCCC" }, { hex: "00B3B3" },
      { hex: "009999" }, { hex: "008080" }
    ]
  },
  {
    id: "blue",
    name: "أزرق",
    description: "تدرجات الأزرق",
    colors: [
      { hex: "B3CCFF" }, { hex: "80A6FF" }, { hex: "4D80FF" }, { hex: "1A59FF" },
      { hex: "0040FF" }, { hex: "0039E6" }, { hex: "0033CC" }, { hex: "002DB3" },
      { hex: "002699" }, { hex: "002080" }
    ]
  },
  {
    id: "purple",
    name: "بنفسجي",
    description: "تدرجات البنفسجي",
    colors: [
      { hex: "E6B3FF" }, { hex: "D580FF" }, { hex: "C44DFF" }, { hex: "B31AFF" },
      { hex: "A600FF" }, { hex: "9500E6" }, { hex: "8500CC" }, { hex: "7400B3" },
      { hex: "640099" }, { hex: "540080" }
    ]
  },
  {
    id: "pink",
    name: "وردي / ماجنتا",
    description: "تدرجات الوردي والماجنتا",
    colors: [
      { hex: "FFB3D9" }, { hex: "FF80C0" }, { hex: "FF4DA6" }, { hex: "FF1A8C" },
      { hex: "FF007F" }, { hex: "E60073" }, { hex: "CC0066" }, { hex: "B30059" },
      { hex: "99004D" }, { hex: "800040" }
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