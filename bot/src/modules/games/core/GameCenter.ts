import { EmbedBuilder } from "discord.js";
import { gameRegistry } from "../core/GameRegistry";

export function registerGameCenterComponents(router: any) {
  router.registerSelect("game:center:select", async (interaction: any) => {
    const gameId = interaction.values[0];
    const game = gameRegistry.get(gameId);
    if (!game) {
      await interaction.reply({ content: "لعبة غير موجودة.", ephemeral: true });
      return;
    }
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(game.name)
      .setDescription(game.description)
      .addFields(
        { name: "النوع", value: game.category, inline: true },
        { name: "اللاعبون", value: `${game.minPlayers}-${game.maxPlayers}`, inline: true },
        { name: "المدة", value: `${game.duration} ثانية`, inline: true },
        { name: "طريقة التشغيل", value: `,\`${game.id}\``, inline: false }
      );
    await interaction.reply({ embeds: [embed], ephemeral: true });
  });
}