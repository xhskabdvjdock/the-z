import { EmbedBuilder, Interaction } from "discord.js";
import { BotEvent } from "../types/event";
import { componentRouter } from "../handlers/componentRouter";
import { buildSlashContext } from "../utils/context";
import { getGuildConfig } from "../utils/guildConfig";
import { checkCommandPermission } from "../utils/permissions";
import { buildMessageFromCustom } from "../utils/embed";

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

        // Defer immediately to avoid timeout - مع التعامل مع rate limit
        await client.withRetry(async () => {
          await interaction.deferReply({ ephemeral: false });
        }, 2, 500).catch(() => null);

        const gConfig = await getGuildConfig(client, interaction.guild.id);
        const override = gConfig.commandOverrides?.find((c) => c.name === command.name);

        if (override && !override.enabled) {
          await client.withRetry(async () => {
            await interaction.editReply({
              content: "This command is disabled in this server."
            });
          }, 2, 500).catch(() => null);
          return;
        }

        if (override && !override.slashEnabled) {
          await client.withRetry(async () => {
            await interaction.editReply({
              content: "This command is disabled as a Slash Command in this server."
            });
          }, 2, 500).catch(() => null);
          return;
        }

        const permCheck = checkCommandPermission(
          override,
          interaction.member as any,
          interaction.channelId
        );
        if (!permCheck.allowed) {
          await client.withRetry(async () => {
            await interaction.editReply({ content: permCheck.reason });
          }, 2, 500).catch(() => null);
          return;
        }

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
          await client.withRetry(async () => {
            await interaction.editReply(payload as any);
          }, 2, 500).catch(() => null);
          return;
        }

        const ctx = buildSlashContext(client, interaction);
        await command.run(ctx);
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
    } catch (err: any) {
      console.error("خطأ أثناء معالجة التفاعل:", err);

      // التعامل مع rate limits بشكل خاص
      if (err.code === 50001 || err.message?.includes('Rate limit')) {
        console.warn('[Interaction] Rate limit hit, skipping error response');
        return;
      }

      const errorEmbed = new EmbedBuilder()
        .setColor(0xed4245)
        .setDescription("❌ حدث خطأ غير متوقع أثناء تنفيذ هذا الإجراء.");
      if (interaction.isRepliable()) {
        if (interaction.replied || interaction.deferred) {
          await client.withRetry(async () => {
            await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
          }, 2, 500).catch(() => null);
        } else {
          await client.withRetry(async () => {
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
          }, 2, 500).catch(() => null);
        }
      }
    }
  }
};

export default event;
