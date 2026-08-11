/** القائمة المرجعية لكل الأوامر المتاحة في البوت (تُستخدم لتهيئة لوحة إدارة الأوامر) */
export interface CommandMeta {
  name: string;
  category:
    | "عام"
    | "إشراف"
    | "تذاكر"
    | "رومات صوتية"
    | "مستويات"
    | "رولات"
    | "قوائم سياق";
  descriptionAr: string;
  /** نوع الأمر: /slash (افتراضي) أو قائمة سياق (زر الفأرة الأيمن) */
  type?: "slash" | "context-menu";
}

export const DEFAULT_COMMANDS: CommandMeta[] = [
  { name: "ping", category: "عام", descriptionAr: "عرض زمن استجابة البوت" },
  { name: "help", category: "عام", descriptionAr: "عرض قائمة الأوامر" },
  { name: "serverinfo", category: "عام", descriptionAr: "معلومات السيرفر" },
  { name: "userinfo", category: "عام", descriptionAr: "معلومات العضو" },
  { name: "avatar", category: "عام", descriptionAr: "عرض صورة العضو" },
  { name: "banner", category: "عام", descriptionAr: "عرض بانر العضو" },
  { name: "botinfo", category: "عام", descriptionAr: "معلومات عن البوت" },
  { name: "suggest", category: "عام", descriptionAr: "إرسال اقتراح" },
  { name: "poll", category: "عام", descriptionAr: "إنشاء استبيان تصويت" },
  { name: "afk", category: "عام", descriptionAr: "تعيين حالة AFK" },
  { name: "translate", category: "عام", descriptionAr: "ترجمة نص إلى لغة أخرى" },

  { name: "ban", category: "إشراف", descriptionAr: "حظر عضو" },
  { name: "unban", category: "إشراف", descriptionAr: "فك حظر عضو" },
  { name: "kick", category: "إشراف", descriptionAr: "طرد عضو" },
  { name: "mute", category: "إشراف", descriptionAr: "كتم عضو" },
  { name: "unmute", category: "إشراف", descriptionAr: "فك كتم عضو" },
  { name: "warn", category: "إشراف", descriptionAr: "تحذير عضو" },
  { name: "warnings", category: "إشراف", descriptionAr: "عرض تحذيرات عضو" },
  { name: "clear", category: "إشراف", descriptionAr: "حذف رسائل" },
  { name: "lock", category: "إشراف", descriptionAr: "قفل الروم" },
  { name: "unlock", category: "إشراف", descriptionAr: "فتح الروم" },
  { name: "slowmode", category: "إشراف", descriptionAr: "تحديد وضع البطيء" },
  { name: "setup-logs", category: "إشراف", descriptionAr: "إنشاء رومات اللوق تلقائيًا" },

  { name: "ticket-panel", category: "تذاكر", descriptionAr: "إرسال لوحة فتح التذاكر" },
  { name: "ticket-add", category: "تذاكر", descriptionAr: "إضافة عضو للتذكرة" },
  { name: "ticket-remove", category: "تذاكر", descriptionAr: "إزالة عضو من التذكرة" },
  { name: "ticket-close", category: "تذاكر", descriptionAr: "إغلاق التذكرة" },

  { name: "rank", category: "مستويات", descriptionAr: "عرض بطاقة رتبتك" },
  { name: "leaderboard", category: "مستويات", descriptionAr: "عرض قائمة المتصدرين" },
  { name: "setlevel", category: "مستويات", descriptionAr: "تعديل مستوى عضو" },

  { name: "colors-panel", category: "رولات", descriptionAr: "إرسال قائمة الألوان" },
  { name: "selfrole-panel", category: "رولات", descriptionAr: "إرسال لوحة الرتب الذاتية" },

  { name: "voice-setup", category: "رومات صوتية", descriptionAr: "إرسال لوحة إنشاء الرومات الصوتية المؤقتة" },

  {
    name: "Text Image",
    category: "قوائم سياق",
    type: "context-menu",
    descriptionAr: "زر الفأرة الأيمن: إنشاء صورة من نص الرسالة"
  }
];
