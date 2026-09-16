import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { componentRouter } from "../../handlers/componentRouter";
import { toggleVote } from "./voteStore";

export function registerSuggestionComponents(router: typeof componentRouter) {
  router.registerButton("suggest:", async (interaction: any) => {
    const match = interaction.customId.match(/^suggest:(up|down):(.+)$/);
    if (!match) return;
    const [, type, suggestionId] = match;

    const result = await toggleVote(suggestionId, (interaction as any).user.id, type as "up" | "down");
    if (!result.found) {
      await (interaction as any).reply({ content: "الاقتراح غير موجود.", ephemeral: true });
      return;
    }

    const { upCount, downCount } = result;
    const statusLabel = result.status === "pending" ? "قيد المراجعة" : (result.status ?? "pending");

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`suggest:up:${suggestionId}`).setLabel(String(upCount)).setStyle(ButtonStyle.Success).setEmoji("👍"),
      new ButtonBuilder().setCustomId(`suggest:down:${suggestionId}`).setLabel(String(downCount)).setStyle(ButtonStyle.Danger).setEmoji("👎"),
      new ButtonBuilder().setCustomId(`suggest:status:${suggestionId}`).setLabel(statusLabel).setStyle(ButtonStyle.Secondary).setDisabled(true)
    );

    try {
      await (interaction as any).update({ components: [row] });
    } catch {
      await (interaction as any).reply({ content: `تم تسجيل تصويتك. 👍 ${upCount} | 👎 ${downCount}`, ephemeral: true });
    }
  });
}