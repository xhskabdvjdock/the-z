import { EmbedBuilder } from "discord.js";
import { BotCommand } from "../../types/command";
import { getGuildConfig } from "../../utils/guildConfig";
import { GAMES_LIST } from "@thez/shared";
import { handleXO, handleRoulette, handleRPS, handleDice, handleButton, handleFast } from "../../modules/games/gameManager";

const command: BotCommand = {
  name: "game",
  description: "بدء لعبة",
  category: "أدوات",
  guildOnly: true,
  options: [
    {
      name: "type",
      description: "نوع اللعبة",
      type: "string",
      required: true,
      choices: GAMES_LIST.slice(0, 6).map((g) => ({ name: g.name, value: g.id }))
    },
    {
      name: "user",
      description: "الشخص للعب معه (لبعض الألعاب)",
      type: "user",
      required: false
    }
  ],
  async run(ctx) {
    const type = ctx.getString("type")!;
    const targetUser = await ctx.getUser("user");
    let targetMember = null;
    if (targetUser) {
      targetMember = await ctx.guild.members.fetch(targetUser.id).catch(() => null);
    }

    const gConfig = await getGuildConfig(ctx.client, ctx.guild.id);
    const gameCfg = (gConfig as any).games?.games?.[type];
    if (gameCfg && !gameCfg.enabled) {
      await ctx.reply({ content: "هذه اللعبة معطلة في هذا السيرفر." });
      return;
    }

    const channel = ctx.channel as any;

    switch (type) {
      case "xo":
        await handleXO(channel, ctx.user, targetMember?.user ?? targetUser);
        await ctx.reply({ content: "تم بدء اللعبة!" });
        break;
      case "roulette":
        await handleRoulette(channel, ctx.user);
        await ctx.reply({ content: "تم بدء الروليت!" });
        break;
      case "rps":
        await handleRPS(channel, ctx.user, targetMember?.user ?? targetUser);
        await ctx.reply({ content: "تم بدء حجرة ورقة مقص!" });
        break;
      case "dice":
        await handleDice(channel, ctx.user);
        await ctx.reply({ content: "تم رمي النرد!" });
        break;
      case "button":
        await handleButton(channel, ctx.user);
        await ctx.reply({ content: "تم بدء لعبة الزر!" });
        break;
      case "fast":
        await handleFast(channel, ctx.user);
        await ctx.reply({ content: "تم بدء لعبة اسرع!" });
        break;
      default:
        await ctx.reply({ content: "لعبة قيد التطوير حاليًا" });
    }
  }
};

export default command;