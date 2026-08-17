import { AttachmentBuilder, MessageContextMenuCommandInteraction } from "discord.js";
import { ExtendedClient } from "../client";
import { BotContextMenu } from "../types/contextMenu";
import { convertAttachmentToGif } from "../utils/gifConverter";
import { logError } from "../utils/logger";

const contextMenu: BotContextMenu = {
  name: "تحويل إلى GIF",
  type: "message",
  dmEnabled: true,
  async run(client: ExtendedClient, interaction: MessageContextMenuCommandInteraction) {
    await interaction.deferReply();

    try {
      const target = interaction.targetMessage;
      const message = target.partial ? await target.fetch() : target;

      const attachment = message.attachments.first();
      if (!attachment) {
        await interaction.editReply({
          content: "❌ هذه الرسالة لا تحتوي على صورة أو فيديو."
        });
        return;
      }

      const gifBuffer = await convertAttachmentToGif(attachment, { videoCapSeconds: 10 });

      await interaction.editReply({
        files: [new AttachmentBuilder(gifBuffer, { name: "converted.gif" })]
      });
    } catch (err) {
      logError("convert-gif-menu", err);
      const text = err instanceof Error ? err.message : "تعذر التحويل.";
      await interaction.editReply({ content: `❌ ${text}` }).catch(() => null);
    }
  }
};

export default contextMenu;
