"use server";

import { revalidatePath } from "next/cache";
import { GuildConfig, ICustomMessage } from "@thez/shared";
import { ensureDb } from "@/lib/db";
import { requireGuildAdmin } from "@/lib/guildAccess";
import { logAction, logError, summarizeConfig } from "@/lib/logger";

export interface WelcomeLeaveInput {
  welcome: {
    enabled: boolean;
    channelId?: string;
    sendInDm: boolean;
    imageEnabled: boolean;
    imageBackground?: string;
    message: ICustomMessage;
  };
  leave: {
    enabled: boolean;
    channelId?: string;
    imageEnabled: boolean;
    imageBackground?: string;
    message: ICustomMessage;
  };
}

export async function saveWelcomeConfig(guildId: string, data: WelcomeLeaveInput) {
  try {
    const session = await requireGuildAdmin(guildId);
    await ensureDb();

    await GuildConfig.findOneAndUpdate(
      { guildId },
      { $set: { welcome: data.welcome, leave: data.leave } },
      { upsert: true }
    );

    logAction({
      label: "welcome/save",
      guildId,
      userId: (session.user as any).id,
      userName: session.user?.name ?? undefined,
      action: "حفظ إعدادات الترحيب والمغادرة",
      details: {
        welcomeEnabled: data.welcome.enabled,
        welcomeChannel: data.welcome.channelId ?? null,
        welcomeDm: data.welcome.sendInDm,
        welcomeImage: data.welcome.imageEnabled,
        leaveEnabled: data.leave.enabled,
        leaveChannel: data.leave.channelId ?? null,
        leaveImage: data.leave.imageEnabled
      }
    });

    revalidatePath(`/dashboard/${guildId}/welcome`);
  } catch (error) {
    logError("welcome/save", error);
    throw error;
  }
}
