import { MessageContextMenuCommandInteraction, PermissionResolvable } from "discord.js";
import { ExtendedClient } from "../client";

export interface BotContextMenu {
  name: string;
  /** نوع قائمة السياق — رسائلي حاليًا فقط */
  type?: "message";
  defaultMemberPermissions?: PermissionResolvable;
  run(client: ExtendedClient, interaction: MessageContextMenuCommandInteraction): Promise<void>;
}