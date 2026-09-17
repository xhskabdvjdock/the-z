"use server";

import { revalidatePath } from "next/cache";
import { GuildConfig, GifBlock } from "@thez/shared";
import { ensureDb } from "@/lib/db";
import { requireGuildAdmin } from "@/lib/guildAccess";
import { logAction, logError, summarizeConfig } from "@/lib/logger";

export interface GifBlockInput {
  enabled: boolean;
  logChannelId: string;
  whitelistRoleIds: string[];
  whitelistChannelIds: string[];
  gifBlocks: Array<{
    id: string;
    url: string;
    action: "delete" | "warn" | "mute" | "kick" | "ban";
    duration: number;
    reason: string;
    enabled: boolean;
  }>;
}

export async function saveGifBlockConfig(guildId: string, input: GifBlockInput) {
  // فحص الصلاحيات داخل الـ Server Action نفسه — لا يكفي حارس الصفحة، لأن الإجراء
  // قابل للاستدعاء كطلب مستقل من أي عميل يعرف معرّف السيرفر.
  const session = await requireGuildAdmin(guildId);
  await ensureDb();

  // Update guild config
  await GuildConfig.findOneAndUpdate(
    { guildId },
    {
      $set: {
        "gifBlock.enabled": input.enabled,
        "gifBlock.logChannelId": input.logChannelId,
        "gifBlock.whitelistRoleIds": input.whitelistRoleIds,
        "gifBlock.whitelistChannelIds": input.whitelistChannelIds,
        updatedAt: new Date()
      }
    },
    { upsert: true }
  );

  // Handle GIF blocks
  const existingBlocks = await GifBlock.find({ guildId });
  const existingIds = new Set(existingBlocks.map(b => b._id?.toString()));

  // Update or create blocks
  for (const block of input.gifBlocks) {
    if (existingIds.has(block.id)) {
      await GifBlock.findOneAndUpdate(
        { _id: block.id },
        {
          $set: {
            url: block.url,
            action: block.action,
            duration: block.duration,
            reason: block.reason,
            enabled: block.enabled
          }
        }
      );
      existingIds.delete(block.id);
    } else {
      await GifBlock.create({
        guildId,
        url: block.url,
        action: block.action,
        duration: block.duration,
        reason: block.reason,
        enabled: block.enabled,
        addedBy: "dashboard", // You might want to track the actual user
        addedAt: new Date()
      });
    }
  }

  // Delete removed blocks
  for (const id of existingIds) {
    await GifBlock.deleteOne({ _id: id });
  }

  logAction({
    label: "gifblock/save",
    guildId,
    userId: (session.user as any).id,
    userName: session.user?.name ?? undefined,
    action: "حفظ إعدادات حظر GIFs",
    details: summarizeConfig(input as unknown as Record<string, unknown>)
  });

  revalidatePath(`/dashboard/${guildId}/gifblock`);
}