import { SlashCommandBuilder } from "discord.js";
import { BotCommand } from "../types/command";

export function buildSlashCommandJSON(command: BotCommand) {
  const builder = new SlashCommandBuilder()
    .setName(command.name)
    .setDescription(command.description.slice(0, 100));

  if (command.defaultMemberPermissions) {
    builder.setDefaultMemberPermissions(command.defaultMemberPermissions as any);
  }

  for (const opt of command.options ?? []) {
    const required = !!opt.required;
    switch (opt.type) {
      case "string":
        builder.addStringOption((o) => {
          o.setName(opt.name).setDescription(opt.description).setRequired(required);
          if (opt.choices) o.addChoices(...opt.choices);
          return o;
        });
        break;
      case "integer":
        builder.addIntegerOption((o) =>
          o.setName(opt.name).setDescription(opt.description).setRequired(required)
        );
        break;
      case "number":
        builder.addNumberOption((o) =>
          o.setName(opt.name).setDescription(opt.description).setRequired(required)
        );
        break;
      case "user":
        builder.addUserOption((o) =>
          o.setName(opt.name).setDescription(opt.description).setRequired(required)
        );
        break;
      case "channel":
        builder.addChannelOption((o) =>
          o.setName(opt.name).setDescription(opt.description).setRequired(required)
        );
        break;
      case "role":
        builder.addRoleOption((o) =>
          o.setName(opt.name).setDescription(opt.description).setRequired(required)
        );
        break;
      case "boolean":
        builder.addBooleanOption((o) =>
          o.setName(opt.name).setDescription(opt.description).setRequired(required)
        );
        break;
    }
  }

  return builder.toJSON();
}
