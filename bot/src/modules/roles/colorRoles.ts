import {
  ActionRowBuilder,
  EmbedBuilder,
  GuildMember,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  TextChannel
} from "discord.js";
import { GuildConfig, IGuildConfig } from "@thez/shared";
import { ComponentRouter } from "../../handlers/componentRouter";
import { ExtendedClient } from "../../client";
import { getGuildConfig } from "../../utils/guildConfig";

const SELECT_ID = "color_select";

/** يسجّل معالج قائمة اختيار الألوان (نظام لون واحد فقط لكل عضو) */
export function registerColorComponents(router: ComponentRouter): void {
  router.registerSelect(SELECT_ID, async (interaction: StringSelectMenuInteraction, client: ExtendedClient) => {
    if (!interaction.guild) return;

    const gConfig = await getGuildConfig(client, interaction.guild.id);
    const colorRoles = gConfig.colors?.roles ?? [];

    const selectedRoleId = interaction.values[0];
    const colorRole = colorRoles.find((c) => c.roleId === selectedRoleId);

    if (!colorRole) {
      await interaction.reply({ content: "❌ هذا اللون لم يعد متاحاً.", ephemeral: true });
      return;
    }

    const member = interaction.member as GuildMember;

    if (colorRole.allowedRoleIds?.length) {
      const hasAllowed = colorRole.allowedRoleIds.some((r) => member.roles.cache.has(r));
      if (!hasAllowed) {
        await interaction.reply({ content: "❌ لا تملك الصلاحية لاختيار هذا اللون.", ephemeral: true });
        return;
      }
    }

    const allColorRoleIds = colorRoles.map((c) => c.roleId);
    const rolesToRemove = allColorRoleIds.filter(
      (id) => id !== selectedRoleId && member.roles.cache.has(id)
    );

    if (rolesToRemove.length) {
      await member.roles.remove(rolesToRemove).catch(() => null);
    }

    await member.roles.add(selectedRoleId).catch(() => null);

    await interaction.reply({ content: "✅ تم تغيير لونك", ephemeral: true });
  });
}

/** يرسل لوحة اختيار الألوان في قناة معيّنة، ويحفظ موقعها في إعدادات السيرفر */
export async function sendColorPanel(channel: TextChannel, gConfig: IGuildConfig): Promise<void> {
  const colorRoles = gConfig.colors?.roles ?? [];

  const embed = new EmbedBuilder()
    .setColor("#5865F2")
    .setTitle("🎨 اختر لون اسمك")
    .setDescription("اختر لوناً من القائمة أدناه لتلوين اسمك في السيرفر.");

  const select = new StringSelectMenuBuilder().setCustomId(SELECT_ID).setPlaceholder("اختر لوناً...");

  for (const role of colorRoles.slice(0, 25)) {
    select.addOptions({
      label: role.name,
      value: role.roleId,
      emoji: role.emoji || undefined
    });
  }

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);

  const sentMessage = await channel.send({ embeds: [embed], components: [row] });

  await GuildConfig.findOneAndUpdate(
    { guildId: gConfig.guildId },
    {
      $set: {
        "colors.panelChannelId": channel.id,
        "colors.panelMessageId": sentMessage.id
      }
    }
  );
}
