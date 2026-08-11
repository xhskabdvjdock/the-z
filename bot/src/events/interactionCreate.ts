import { EmbedBuilder, GuildMember, Interaction, InteractionReplyOptions } from "discord.js";
import { BotEvent } from "../types/event";
import { componentRouter } from "../handlers/componentRouter";
import { buildSlashContext } from "../utils/context";
import { getGuildConfig } from "../utils/guildConfig";
import { checkCommandPermission } from "../utils/permissions";
import { buildMessageFromCustom } from "../utils/embed";
import { applyCommandCooldown, checkCommandCooldown } from "../utils/cooldown";
import { logError } from "../utils/logger";

const event: BotEvent = {
  name: "interactionCreate",
  async execute(client, interaction: Interaction) {
    try {
      if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;
        if (!interaction.guild || !interaction.member) {
          await interaction.reply({ content: "❌ هذا الأمر يعمل داخل السيرفرات فقط." });
          return;
        }

        const gConfig = await getGuildConfig(client, interaction.guild.id);
        const override = gConfig.commandOverrides?.find((c) => c.name === command.name);

        if (override && !override.enabled) {
          await interaction.reply({
            content: "This command is disabled in this server.",
            ephemeral: true
          });
          return;
        }

        if (override && !override.slashEnabled) {
          await interaction.reply({
            content: "This command is disabled as a Slash Command in this server.",
            ephemeral: true
          });
          return;
        }

        const permCheck = checkCommandPermission(
          override,
          interaction.member as GuildMember,
          interaction.channelId
        );
        if (!permCheck.allowed) {
          await interaction.reply({ content: permCheck.reason, ephemeral: true });
          return;
        }

        const cdCheck = checkCommandCooldown(
          client,
          command,
          interaction.guild.id,
          interaction.user.id,
          override
        );
        if (!cdCheck.allowed) {
          await interaction.reply({
            content: `⏳ هذا الأمر قيد البرودة — انتظر ${cdCheck.remainingSeconds} ثانية تقريبًا.`,
            ephemeral: true
          });
          return;
        }
        applyCommandCooldown(client, command, interaction.guild.id, interaction.user.id, override);

        if (override?.customResponse?.enabled) {
          const payload = buildMessageFromCustom(override.customResponse, {
            user: {
              id: interaction.user.id,
              username: interaction.user.username,
              tag: interaction.user.tag,
              mention: `<@${interaction.user.id}>`,
              avatarURL: interaction.user.displayAvatarURL()
            },
            server: {
              name: interaction.guild.name,
              id: interaction.guild.id,
              memberCount: interaction.guild.memberCount,
              iconURL: interaction.guild.iconURL() ?? undefined
            }
          });
          await interaction.reply(payload as InteractionReplyOptions);
          return;
        }

        const ctx = buildSlashContext(client, interaction);
        await command.run(ctx);
        return;
      }

      if (interaction.isMessageContextMenuCommand()) {
        const contextMenu = client.contextMenus.get(interaction.commandName);
        if (!contextMenu) return;
        if (!interaction.guild || !interaction.member) {
          await interaction.reply({ content: "❌ هذا الأمر يعمل داخل السيرفرات فقط." });
          return;
        }
        await contextMenu.run(client, interaction);
        return;
      }

      if (interaction.isButton()) {
        await componentRouter.dispatchButton(interaction, client);
        return;
      }

      if (interaction.isStringSelectMenu()) {
        await componentRouter.dispatchSelect(interaction, client);
        return;
      }

      if (interaction.isModalSubmit()) {
        await componentRouter.dispatchModal(interaction, client);
        return;
      }
    } catch (err) {
      logError("interaction", err);
      const errorEmbed = new EmbedBuilder()
        .setColor(0xed4245)
        .setDescription("❌ حدث خطأ غير متوقع أثناء تنفيذ هذا الإجراء.");
      if (interaction.isRepliable()) {
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ embeds: [errorEmbed], ephemeral: true }).catch(() => null);
        } else {
          await interaction.reply({ embeds: [errorEmbed], ephemeral: true }).catch(() => null);
        }
      }
    }
  }
};

export default event;
