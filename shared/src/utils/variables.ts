/** بيانات السياق المتاحة لاستبدال المتغيرات داخل الرسائل المخصصة */
export interface VariableContext {
  user?: {
    id: string;
    username: string;
    tag: string;
    mention: string;
    avatarURL?: string;
    joinedAt?: string;
  };
  server?: {
    name: string;
    id: string;
    memberCount?: number;
    iconURL?: string;
    boostCount?: number;
  };
  extra?: Record<string, string | number | undefined>;
}

/**
 * يستبدل المتغيرات الديناميكية مثل {user}, {user.tag}, {server}, {memberCount}
 * داخل أي نص. يمكن استخدامه على المحتوى النصي أو حقول الإيمبد.
 */
export function applyVariables(text: string | undefined | null, ctx: VariableContext): string {
  if (!text) return "";
  const map: Record<string, string> = {
    "{user}": ctx.user?.mention ?? "",
    "{user.name}": ctx.user?.username ?? "",
    "{user.tag}": ctx.user?.tag ?? "",
    "{user.id}": ctx.user?.id ?? "",
    "{user.avatar}": ctx.user?.avatarURL ?? "",
    "{user.joined}": ctx.user?.joinedAt ?? "",
    "{server}": ctx.server?.name ?? "",
    "{server.name}": ctx.server?.name ?? "",
    "{server.id}": ctx.server?.id ?? "",
    "{server.icon}": ctx.server?.iconURL ?? "",
    "{memberCount}": ctx.server?.memberCount?.toString() ?? "",
    "{boostCount}": ctx.server?.boostCount?.toString() ?? ""
  };

  if (ctx.extra) {
    for (const [key, value] of Object.entries(ctx.extra)) {
      map[`{${key}}`] = value?.toString() ?? "";
    }
  }

  let result = text;
  for (const [key, value] of Object.entries(map)) {
    result = result.split(key).join(value);
  }
  return result;
}

export const AVAILABLE_VARIABLES = [
  { key: "{user}", description: "منشن العضو" },
  { key: "{user.name}", description: "اسم العضو" },
  { key: "{user.tag}", description: "يوزر العضو الكامل" },
  { key: "{user.id}", description: "آيدي العضو" },
  { key: "{user.avatar}", description: "رابط صورة العضو" },
  { key: "{user.joined}", description: "تاريخ انضمام العضو" },
  { key: "{server}", description: "اسم السيرفر" },
  { key: "{server.id}", description: "آيدي السيرفر" },
  { key: "{server.icon}", description: "رابط أيقونة السيرفر" },
  { key: "{memberCount}", description: "عدد الأعضاء" },
  { key: "{boostCount}", description: "عدد البوستات" }
];
