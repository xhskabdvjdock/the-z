import {
  ButtonInteraction,
  GuildMember,
  StringSelectMenuInteraction,
  TextChannel
} from "discord.js";
import { GuildConfig, ISelfRolePanel, buildRolePanelMessage } from "@thez/shared";
import { ComponentRouter } from "../../handlers/componentRouter";
import { ExtendedClient } from "../../client";
import { getGuildConfig } from "../../utils/guildConfig";

const BUTTON_PREFIX = "selfrole_btn_";
const SELECT_PREFIX = "selfrole_select_";

function parseButtonCustomId(customId: string): { panelId: string; roleId: string } {
  const rest = customId.slice(BUTTON_PREFIX.length);
  const lastUnderscore = rest.lastIndexOf("_");
  return {
    panelId: rest.slice(0, lastUnderscore),
    roleId: rest.slice(lastUnderscore + 1)
  };
}

/** يسجّل معالجات الأزرار والقوائم الخاصة بلوحات الرتب الذاتية */
export function registerSelfRoleComponents(router: ComponentRouter): void {
  router.registerButton(BUTTON_PREFIX, async (interaction: ButtonInteraction, client: ExtendedClient) => {
    if (!interaction.guild) return;

    const { panelId, roleId } = parseButtonCustomId(interaction.customId);
    const gConfig = await getGuildConfig(client, interaction.guild.id);
    const panel = gConfig.selfRoles?.find((p) => p.id === panelId);

    if (!panel) {
      await interaction.reply({ content: "❌ هذه اللوحة لم تعد متاحة.", ephemeral: true });
      return;
    }

    if (panel.enabled === false) {
      await interaction.reply({ content: "❌ هذه اللوحة معطّلة حاليًا.", ephemeral: true });
      return;
    }

    const member = interaction.member as GuildMember;
    const hasRole = member.roles.cache.has(roleId);

    if (!hasRole && panel.maxRoles && panel.maxRoles > 0) {
      const panelRoleIds = panel.options.map((o) => o.roleId);
      const currentCount = panelRoleIds.filter((id) => member.roles.cache.has(id)).length;
      if (currentCount >= panel.maxRoles) {
        await interaction.reply({
          content: `❌ لا يمكنك اختيار أكثر من ${panel.maxRoles} رتبة من هذه اللوحة.`,
          ephemeral: true
        });
        return;
      }
    }

    if (hasRole) {
      await member.roles.remove(roleId).catch(() => null);
      await interaction.reply({ content: "✅ تمت إزالة الرتبة منك.", ephemeral: true });
    } else {
      await member.roles.add(roleId).catch(() => null);
      await interaction.reply({ content: "✅ تمت إضافة الرتبة إليك.", ephemeral: true });
    }
  });

  router.registerSelect(SELECT_PREFIX, async (interaction: StringSelectMenuInteraction, client: ExtendedClient) => {
    if (!interaction.guild) return;

    const panelId = interaction.customId.slice(SELECT_PREFIX.length);
    const gConfig = await getGuildConfig(client, interaction.guild.id);
    const panel = gConfig.selfRoles?.find((p) => p.id === panelId);

    if (!panel) {
      await interaction.reply({ content: "❌ هذه اللوحة لم تعد متاحة.", ephemeral: true });
      return;
    }

    if (panel.enabled === false) {
      await interaction.reply({ content: "❌ هذه اللوحة معطّلة حاليًا.", ephemeral: true });
      return;
    }

    const panelRoleIds = panel.options.map((o) => o.roleId);
    const selectedRoleIds = interaction.values;

    if (panel.maxRoles && panel.maxRoles > 0 && selectedRoleIds.length > panel.maxRoles) {
      await interaction.reply({
        content: `❌ لا يمكنك اختيار أكثر من ${panel.maxRoles} رتبة من هذه اللوحة.`,
        ephemeral: true
      });
      return;
    }

    const member = interaction.member as GuildMember;
    const toAdd = selectedRoleIds.filter((id) => !member.roles.cache.has(id));
    const toRemove = panelRoleIds.filter(
      (id) => !selectedRoleIds.includes(id) && member.roles.cache.has(id)
    );

    if (toAdd.length) await member.roles.add(toAdd).catch(() => null);
    if (toRemove.length) await member.roles.remove(toRemove).catch(() => null);

    await interaction.reply({ content: "✅ تم تحديث رتبك.", ephemeral: true });
  });
}

/** يرسل لوحة رتب ذاتية (أزرار أو قائمة منسدلة)، ويحفظ موقعها في إعدادات هذه اللوحة تحديداً */
export async function sendSelfRolePanel(
  channel: TextChannel,
  panel: ISelfRolePanel,
  guildId: string
): Promise<void> {
  const payload = buildRolePanelMessage(panel);
  const sentMessage = await channel.send({
    embeds: payload.embeds,
    components: payload.components as never
  });

  await GuildConfig.findOneAndUpdate(
    { guildId, "selfRoles.id": panel.id },
    {
      $set: {
        "selfRoles.$.messageId": sentMessage.id,
        "selfRoles.$.channelId": channel.id
      }
    }
  );
}

/**
 * تحديث لوحة منشورة: يعدّل نفس الرسالة إن كانت لا تزال موجودة (channelId +
 * messageId محفوظان)، وإلا يرسل رسالة جديدة وينقّل الموقع. تُستخدم عند تعديل
 * اللوحة من الداشبورد أو تحديثها بعد أي تغيير.
 */
export async function updateSelfRolePanel(
  client: ExtendedClient,
  panel: ISelfRolePanel,
  guildId: string
): Promise<void> {
  const payload = buildRolePanelMessage(panel);

  if (panel.channelId && panel.messageId) {
    try {
      const channel = await client.channels.fetch(panel.channelId);
      if (channel?.isTextBased()) {
        const message = await channel.messages.fetch(panel.messageId);
        await message.edit({ embeds: payload.embeds, components: payload.components as never });
        return;
      }
    } catch {
      // الرسالة/القناة لم تعد متاحة — سنرسل رسالة جديدة أدناه
    }
  }

  const channel = panel.channelId
    ? ((await client.channels.fetch(panel.channelId).catch(() => null)) as TextChannel | null)
    : null;
  if (!channel?.isTextBased()) return;

  const sentMessage = await channel.send({
    embeds: payload.embeds,
    components: payload.components as never
  });

  await GuildConfig.findOneAndUpdate(
    { guildId, "selfRoles.id": panel.id },
    {
      $set: {
        "selfRoles.$.messageId": sentMessage.id,
        "selfRoles.$.channelId": channel.id
      }
    }
  );
}
