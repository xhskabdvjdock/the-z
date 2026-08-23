import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import { Suggestion } from "@thez/shared";
import { componentRouter } from "../../handlers/componentRouter";
import { config } from "../../config";

function buildSuggestionEmbed(content: string, userTag: string, status: string, up: number, down: number) {
  const statusMap: Record<string, string> = {
    pending: "قيد المراجعة",
    approved: "مقبول",
    rejected: "مرفوض",
    implemented: "تم التنفيذ"
  };
  const colorMap: Record<string, number> = {
    pending: config.defaultColor as number,
    approved: 0x57f287,
    rejected: 0xed4245,
    implemented: 0x5865f2
  };
  return new EmbedBuilder()
    .setColor(colorMap[status] ?? (config.defaultColor as number))
    .setTitle(`اقتراح من ${userTag}`)
    .setDescription(content)
    .addFields(
      { name: "التصويت", value: `👍 ${up} | 👎 ${down}`, inline: true },
      { name: "الحالة", value: statusMap[status] ?? status, inline: true }
    )
    .setFooter({ text: `الحالة: ${statusMap[status] ?? status}` })
    .setTimestamp();
}

export function registerSuggestionComponents(router: typeof componentRouter) {
  router.registerButton("suggest:", async (interaction: any) => {
    const match = interaction.customId.match(/^suggest:(up|down):(.+)$/);
    if (!match) return;
    const [, type, suggestionId] = match;

    const suggestion = await Suggestion.findOne({ id: suggestionId });
    if (!suggestion) {
      await (interaction as any).reply({ content: "الاقتراح غير موجود.", ephemeral: true });
      return;
    }

    const userId = (interaction as any).user.id;
    const isUp = type === "up";

    let upvotes = [...(suggestion.upvotes ?? [])];
    let downvotes = [...(suggestion.downvotes ?? [])];

    const hasUp = upvotes.includes(userId);
    const hasDown = downvotes.includes(userId);

    if (isUp) {
      if (hasUp) {
        upvotes = upvotes.filter((id) => id !== userId);
      } else {
        upvotes.push(userId);
        downvotes = downvotes.filter((id) => id !== userId);
      }
    } else {
      if (hasDown) {
        downvotes = downvotes.filter((id) => id !== userId);
      } else {
        downvotes.push(userId);
        upvotes = upvotes.filter((id) => id !== userId);
      }
    }

    await Suggestion.findOneAndUpdate(
      { id: suggestionId },
      { $set: { upvotes, downvotes, updatedAt: new Date().toISOString() } }
    );

    const embed = buildSuggestionEmbed(suggestion.content, suggestion.userName, suggestion.status, upvotes.length, downvotes.length);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`suggest:up:${suggestionId}`).setLabel(String(upvotes.length)).setStyle(ButtonStyle.Success).setEmoji("👍"),
      new ButtonBuilder().setCustomId(`suggest:down:${suggestionId}`).setLabel(String(downvotes.length)).setStyle(ButtonStyle.Danger).setEmoji("👎"),
      new ButtonBuilder().setCustomId(`suggest:status:${suggestionId}`).setLabel(suggestion.status === "pending" ? "قيد المراجعة" : suggestion.status).setStyle(ButtonStyle.Secondary).setDisabled(true)
    );

    try {
      await (interaction as any).update({ embeds: [embed], components: [row] });
    } catch {
      await (interaction as any).reply({ content: `تم تسجيل تصويتك. 👍 ${upvotes.length} | 👎 ${downvotes.length}`, ephemeral: true });
    }
  });
}