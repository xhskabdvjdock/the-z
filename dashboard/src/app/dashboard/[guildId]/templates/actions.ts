"use server";

import { revalidatePath } from "next/cache";
import { ServerTemplate } from "@thez/shared";
import { ensureDb } from "@/lib/db";
import { requireGuildAdmin } from "@/lib/guildAccess";
import { logAction, logError } from "@/lib/logger";
import { createBackup } from "../backup/actions";
import { restoreBackup } from "../backup/restoreActions";

export async function saveTemplate(guildId: string, data: { name: string; description?: string }) {
  try {
    const session = await requireGuildAdmin(guildId);

    const backup = await createBackup(guildId);

    await ensureDb();
    await ServerTemplate.create({
      name: data.name.trim(),
      description: data.description?.trim() || undefined,
      guildId,
      guildName: backup.guildName,
      backup,
      createdAt: new Date()
    });

    logAction({
      label: "templates/save",
      guildId,
      userId: (session.user as any).id,
      userName: session.user?.name ?? undefined,
      action: `حفظ قالب جديد: ${data.name}`,
      details: {
        roles: backup.roles.length,
        channels: backup.channels.length
      }
    });

    revalidatePath(`/dashboard/${guildId}/templates`);
  } catch (error) {
    logError("templates/save", error);
    throw error;
  }
}

export async function applyTemplate(guildId: string, templateId: string) {
  try {
    const session = await requireGuildAdmin(guildId);
    await ensureDb();

    const template = await ServerTemplate.findOne({ id: templateId }).lean();
    if (!template) throw new Error("القالب غير موجود");

    await restoreBackup(guildId, template.backup);

    logAction({
      label: "templates/apply",
      guildId,
      userId: (session.user as any).id,
      userName: session.user?.name ?? undefined,
      action: `تطبيق قالب: ${template.name}`,
      details: {
        roles: template.backup.roles.length,
        channels: template.backup.channels.length
      }
    });

    revalidatePath(`/dashboard/${guildId}/templates`);
  } catch (error) {
    logError("templates/apply", error);
    throw error;
  }
}

export async function deleteTemplate(templateId: string) {
  try {
    await ensureDb();
    const template = await ServerTemplate.findOne({ id: templateId }).lean();
    if (!template) throw new Error("القالب غير موجود");
    await requireGuildAdmin(template.guildId);
    await ServerTemplate.deleteOne({ id: templateId });
  } catch (error) {
    logError("templates/delete", error);
    throw error;
  }
}