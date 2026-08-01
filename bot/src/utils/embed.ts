import {
  ActionRowBuilder,
  BaseMessageOptions,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} from "discord.js";
import { applyVariables, VariableContext, ICustomMessage } from "@thez/shared";

const STYLE_MAP: Record<string, ButtonStyle> = {
  PRIMARY: ButtonStyle.Primary,
  SECONDARY: ButtonStyle.Secondary,
  SUCCESS: ButtonStyle.Success,
  DANGER: ButtonStyle.Danger,
  LINK: ButtonStyle.Link
};

/** يحوّل رسالة مخصصة (ICustomMessage) مخزّنة في قاعدة البيانات إلى خيارات رسالة ديسكورد جاهزة */
export function buildMessageFromCustom(
  custom: ICustomMessage | undefined,
  ctx: VariableContext,
  guildConfig?: { embedColor?: string }
): BaseMessageOptions {
  const options: BaseMessageOptions = {};

  if (custom?.content) {
    options.content = applyVariables(custom.content, ctx);
  }

  if (custom?.embed?.enabled) {
    const embed = new EmbedBuilder();
    if (custom.embed.title) embed.setTitle(applyVariables(custom.embed.title, ctx).slice(0, 256));
    if (custom.embed.description)
      embed.setDescription(applyVariables(custom.embed.description, ctx).slice(0, 4096));
    if (custom.embed.color) {
      embed.setColor(custom.embed.color as `#${string}`);
    } else if (guildConfig?.embedColor) {
      embed.setColor(parseInt(guildConfig.embedColor.replace('#', ''), 16));
    }
    if (custom.embed.image) embed.setImage(applyVariables(custom.embed.image, ctx));
    if (custom.embed.thumbnail && ctx.user?.avatarURL) embed.setThumbnail(ctx.user.avatarURL);
    if (custom.embed.footer) embed.setFooter({ text: applyVariables(custom.embed.footer, ctx) });
    if (custom.embed.author) embed.setAuthor({ name: applyVariables(custom.embed.author, ctx) });
    options.embeds = [embed];
  }

  if (custom?.buttons?.length) {
    const row = new ActionRowBuilder<ButtonBuilder>();
    for (const btn of custom.buttons.slice(0, 5)) {
      const button = new ButtonBuilder()
        .setLabel(btn.label || "زر")
        .setStyle(STYLE_MAP[btn.style] ?? ButtonStyle.Primary);
      if (btn.emoji) button.setEmoji(btn.emoji);
      if (btn.style === "LINK" && btn.url) {
        button.setURL(btn.url);
      } else {
        button.setCustomId(btn.customId || `custom_${btn.label}`);
      }
      row.addComponents(button);
    }
    options.components = [row];
  }

  return options;
}
