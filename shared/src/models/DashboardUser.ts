import { Collection } from "../db/collection";

/** كاش بسيط اختياري لبيانات المستخدم القادمة من Discord OAuth2 (غير مُستخدم حالياً في المنطق الأساسي) */
export interface IDashboardUser {
  _id?: string;
  discordId: string;
  username?: string;
  avatar?: string;
  accessToken?: string;
  refreshToken?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const DashboardUser = new Collection<IDashboardUser>("dashboard_users", "discordId", () => {
  const now = new Date();
  return { createdAt: now, updatedAt: now };
});
