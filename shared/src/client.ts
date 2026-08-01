/**
 * نقطة دخول آمنة لمكوّنات العميل (Client Components) في لوحة التحكم: تحتوي فقط على
 * الأنواع والدوال النقية التي لا تعتمد على `pg` أو أي وحدات Node الخاصة بالخادم،
 * لتفادي تسريب طبقة قاعدة البيانات إلى حزمة المتصفح (Browser Bundle).
 *
 * استخدم `import ... from "@thez/shared/client"` داخل ملفات "use client" فقط.
 * أما ملفات الخادم (page.tsx / actions.ts / البوت) فتستمر باستخدام `@thez/shared` كما هي.
 */
export * from "./types/guildConfig";
export * from "./utils/variables";
export * from "./utils/leveling";
export * from "./constants/commands";
