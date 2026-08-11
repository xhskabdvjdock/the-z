import { ApplicationCommandType, ContextMenuCommandBuilder } from "discord.js";
import { BotContextMenu } from "../types/contextMenu";

/** يبني JSON تسجيل أمر قائمة سياق (زر الفأرة الأيمن) لتسجيله عبر REST */
export function buildContextMenuJSON(command: BotContextMenu) {
  const builder = new ContextMenuCommandBuilder()
    .setName(command.name)
    .setType(ApplicationCommandType.Message);

  if (command.defaultMemberPermissions) {
    builder.setDefaultMemberPermissions(command.defaultMemberPermissions as any);
  }

  return builder.toJSON();
}