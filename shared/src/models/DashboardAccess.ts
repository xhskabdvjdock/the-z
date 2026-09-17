import { Collection } from "../db/collection";

export interface IDashboardAccess {
  id: string; // always "global"
  allowedUserIds: string[];
  createdAt: string;
  updatedAt: string;
}

export const DashboardAccess = new Collection<IDashboardAccess>("dashboard_access", "id", () => ({
  id: "global",
  allowedUserIds: ["839934741918777415"],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
}));

/**
 * المالك الأساسي للوحة التحكم — يُضبط عبر متغير البيئة `OWNER_ID` (أو `DASHBOARD_OWNER_ID`).
 * القيمة الاحتياطية هي معرّف المالك الأصلي للمشروع حتى لا يتعطّل الوصول إذا لم يُضبط المتغير.
 */
export const OWNER_ID =
  process.env.OWNER_ID || process.env.DASHBOARD_OWNER_ID || "839934741918777415";

export async function getAllowedUserIds(): Promise<string[]> {
  try {
    const doc = await DashboardAccess.findOne({ id: "global" });
    if (!doc) return [OWNER_ID];
    const ids = doc.allowedUserIds ?? [];
    // تأكد أن المالك دائمًا موجود
    if (!ids.includes(OWNER_ID)) return [OWNER_ID, ...ids];
    return ids;
  } catch {
    return [OWNER_ID];
  }
}

export async function isUserAllowed(userId: string): Promise<boolean> {
  if (userId === OWNER_ID) return true;
  const allowed = await getAllowedUserIds();
  return allowed.includes(userId);
}