import { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } from "discord.js";
import { BotCommand } from "../../types/command";
import { gameRegistry } from "../../modules/games/core/GameRegistry";

const command: BotCommand = {
  name: "game",
  description: "عرض مركز الألعاب",
  category: "أدوات",
  guildOnly: true,
  async run(ctx) {
    const allGames = gameRegistry.getAll();
    const multiplayer = allGames.filter((g) => g.category === "جماعية");
    const singleplayer = allGames.filter((g) => g.category === "فردية");

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("مركز الألعاب")
      .setDescription("اختر لعبة من القائمة أو استخدم الأوامر المباشرة")
      .addFields(
        { name: `ألعاب جماعية (${multiplayer.length})`, value: multiplayer.map((g: any) => `**${g.name}** — ${g.description} (\`,${g.id}\`)`).join("\n"), inline: false },
        { name: `ألعاب فردية (${singleplayer.length})`, value: singleplayer.map((g: any) => `**${g.name}** — ${g.description} (\`,${g.id}\`)`).join("\n"), inline: false }
      )
      .setFooter({ text: "استخدم ,roulette أو ,xo ... لبدء لعبة" });

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("game:center:select")
        .setPlaceholder("اختر لعبة لعرض التفاصيل")
        .addOptions(
          allGames.slice(0, 25).map((g) => ({
            label: g.name,
            description: g.description.slice(0, 50),
            value: g.id
          }))
        )
    );

    await ctx.reply({ embeds: [embed], components: [row] });
  }
};

export default command;