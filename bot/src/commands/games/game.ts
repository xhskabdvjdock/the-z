import { EmbedBuilder } from "discord.js";
import { BotCommand } from "../../types/command";
import { config } from "../../config";
import {
  detailRows,
  gameDetailEmbed,
  homeEmbed,
  homeRows,
  leaderboardEmbed,
  leaderboardRows
} from "../../games/gameCenter";
import { registry } from "../../games/core/registry";
import { getLeaderboard } from "../../games/stats/leaderboard";

const command: BotCommand = {
  name: "game",
  description: "مركز The Z Games — استعراض الألعاب واللوائح والإحصاءات",
  category: "ألعاب",
  guildOnly: true,
  options: [
    {
      name: "game",
      description: "عرض تفاصيل لعبة محددة",
      type: "string",
      required: false,
      choices: [
        { name: "XO", value: "xo" },
        { name: "RPS", value: "rps" },
        { name: "روليت", value: "roulette" },
        { name: "مافيا", value: "mafia" },
        { name: "أعلام", value: "flags" },
        { name: "حبل الغسيل", value: "hangman" },
        { name: "الرد السريع", value: "quickdraw" },
        { name: "حقيقة أم جرأة", value: "truthordare" },
        { name: "حرب الأرقام", value: "numberwar" },
        { name: "أربعة في صف", value: "connect4" },
        { name: "خمّن الرقم", value: "guessnumber" },
        { name: "عالٍ أم منخفض", value: "highlow" },
        { name: "زر", value: "button" },
        { name: "أسرع", value: "faster" },
        { name: "ذاكرة", value: "memory" },
        { name: "حساب", value: "math" },
        { name: "سايمون", value: "simon" },
        { name: "زمن رد الفعل", value: "reaction" },
        { name: "طباعة", value: "typing" },
        { name: "أسرع وأسرع", value: "morefaster" },
        { name: "بلاطة اللون", value: "colortile" },
        { name: "فك الترميز", value: "scramble" },
        { name: "أسئلة", value: "trivia" },
        { name: "2048", value: "game2048" }
      ]
    },
    {
      name: "search",
      description: "بحث عن لعبة بالنص",
      type: "string",
      required: false
    },
    {
      name: "board",
      description: "لوائح المتصدرين",
      type: "string",
      required: false,
      choices: [
        { name: "كل السيرفرات", value: "global" },
        { name: "هذا السيرفر", value: "server" },
        { name: "هذا الأسبوع", value: "weekly" },
        { name: "هذا الشهر", value: "monthly" }
      ]
    }
  ],
  async run(ctx) {
    const gameOpt = ctx.getString("game");
    const search = ctx.getString("search");
    const board = ctx.getString("board");

    // لوائح المتصدرين
    if (board) {
      const { embed } = await leaderboardEmbed(ctx.client, ctx.guild, board as any, "all", 0);
      const entries = await getLeaderboard({ guildId: board === "server" ? ctx.guild.id : undefined, scope: board as any });
      const totalPages = Math.max(1, Math.ceil(entries.length / 10));
      await ctx.reply({
        embeds: [embed],
        components: leaderboardRows(board as any, "all", 0, totalPages)
      });
      return;
    }

    // لعبة محددة
    if (gameOpt) {
      const game = registry.get(gameOpt);
      if (!game) {
        await ctx.reply("اللعبة المطلوبة غير موجودة.");
        return;
      }
      await ctx.reply({ embeds: [gameDetailEmbed(game)], components: detailRows(game.name) });
      return;
    }

    // بحث
    if (search) {
      const results = registry.search(search);
      const embed = new EmbedBuilder()
        .setColor(config.defaultColor)
        .setTitle(`نتائج البحث: ${search}`);
      if (!results.length) {
        embed.setDescription("لا توجد نتائج مطابقة.");
      } else {
        for (const g of results.slice(0, 10)) {
          embed.addFields({
            name: `${g.title} (${g.name})`,
            value: `${g.description} — الأمر: \`-${g.name}\``,
            inline: false
          });
        }
      }
      await ctx.reply({ embeds: [embed] });
      return;
    }

    // الصفحة الرئيسية
    await ctx.reply({ embeds: [homeEmbed()], components: homeRows() });
  }
};

export default command;