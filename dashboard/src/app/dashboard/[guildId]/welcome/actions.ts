"use server";

import { revalidatePath } from "next/cache";
import { GuildConfig, ICustomMessage } from "@thez/shared";
import { ensureDb } from "@/lib/db";
import { requireGuildAdmin } from "@/lib/guildAccess";
import { logError } from "@/lib/logger";

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
    await requireGuildAdmin(guildId);
    await ensureDb();

    await GuildConfig.findOneAndUpdate(
      { guildId },
      { $set: { welcome: data.welcome, leave: data.leave } },
      { upsert: true }
    );

    revalidatePath(`/dashboard/${guildId}/welcome`);
  } catch (error) {
    logError("welcome/save", error);
    throw error;
  }
}
