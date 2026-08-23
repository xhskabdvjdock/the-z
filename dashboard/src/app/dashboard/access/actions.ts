"use server";

import { revalidatePath } from "next/cache";
import { DashboardAccess, OWNER_ID } from "@thez/shared";
import { ensureDb } from "@/lib/db";
import { requireDashboardAccess } from "@/lib/guildAccess";
import { logAction, logError } from "@/lib/logger";

export async function getAccessList(): Promise<string[]> {
  const session = await requireDashboardAccess();
  await ensureDb();
  const doc = await DashboardAccess.findOne({ id: "global" });
  const ids = doc?.allowedUserIds ?? [OWNER_ID];
  if (!ids.includes(OWNER_ID)) return [OWNER_ID, ...ids];
  return ids;
}

export async function addAccessId(userId: string) {
  try {
    const session = await requireDashboardAccess();
    await ensureDb();

    const trimmed = userId.trim();
    if (!/^\d{17,19}$/.test(trimmed)) throw new Error("معرّف المستخدم غير صالح — يجب أن يكون 17-19 رقم");

    const doc = await DashboardAccess.findOne({ id: "global" });
    const current = doc?.allowedUserIds ?? [OWNER_ID];
    if (current.includes(trimmed)) throw new Error("هذا المستخدم موجود بالفعل في القائمة");

    const updated = [...current, trimmed];
    await DashboardAccess.findOneAndUpdate(
      { id: "global" },
      { $set: { allowedUserIds: updated, updatedAt: new Date().toISOString() } },
      { upsert: true }
    );

    logAction({
      label: "access/add",
      guildId: "global",
      userId: (session.user as any).id,
      userName: session.user?.name ?? undefined,
      action: "إضافة مستخدم للداشبورد",
      details: { addedUserId: trimmed }
    });

    revalidatePath("/dashboard/access");
  } catch (error) {
    logError("access/add", error);
    throw error;
  }
}

export async function removeAccessId(userId: string) {
  try {
    const session = await requireDashboardAccess();
    await ensureDb();

    if (userId === OWNER_ID) throw new Error("لا يمكن إزالة المالك الأساسي من القائمة");

    const doc = await DashboardAccess.findOne({ id: "global" });
    const current = doc?.allowedUserIds ?? [OWNER_ID];
    if (!current.includes(userId)) throw new Error("المستخدم غير موجود في القائمة");

    const updated = current.filter((id) => id !== userId);
    await DashboardAccess.findOneAndUpdate(
      { id: "global" },
      { $set: { allowedUserIds: updated, updatedAt: new Date().toISOString() } },
      { upsert: true }
    );

    logAction({
      label: "access/remove",
      guildId: "global",
      userId: (session.user as any).id,
      userName: session.user?.name ?? undefined,
      action: "إزالة مستخدم من الداشبورد",
      details: { removedUserId: userId }
    });

    revalidatePath("/dashboard/access");
  } catch (error) {
    logError("access/remove", error);
    throw error;
  }
}