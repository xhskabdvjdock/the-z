"use server";

import { revalidatePath } from "next/cache";
import { GuildConfig, ICustomMessage } from "@thez/shared";
import { ensureDb } from "@/lib/db";
import { requireGuildAdmin } from "@/lib/guildAccess";

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

    console.log("Saving welcome config for guild:", guildId);
    console.log("Data:", JSON.stringify(data, null, 2));

    await GuildConfig.findOneAndUpdate(
      { guildId },
      { $set: { welcome: data.welcome, leave: data.leave } },
      { upsert: true }
    );

    console.log("Welcome config saved successfully");

    revalidatePath(`/dashboard/${guildId}/welcome`);
  } catch (error) {
    console.error("Error saving welcome config:", error);
    throw error;
  }
}
