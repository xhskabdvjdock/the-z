import { EmbedBuilder } from "discord.js";
import { BotCommand } from "../../types/command";
import { getGuildConfig } from "../../utils/guildConfig";
import { GAMES_LIST } from "@thez/shared";
import * as GM from "../../modules/games/gameManager";

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
      choices: GAMES_LIST.map((g) => ({ name: g.name, value: g.id }))
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

    const g = GM as any;
    const fizboGames = ["mafia", "roulette", "hide", "chairs", "draw"];
    if (fizboGames.includes(type)) {
      const { startFizboGame } = await import("../../modules/games/fizboGames");
      await startFizboGame(channel, type, ctx.user.id, ctx.guild.id);
      await ctx.reply({ content: `تم إنشاء لوبي ${type} — انضموا!` });
      return;
    }
    const map: Record<string, () => Promise<void>> = {
      xo: () => g.handleXO(channel, ctx.user, targetMember?.user ?? targetUser),
      rps: () => g.handleRPS(channel, ctx.user, targetMember?.user ?? targetUser),
      dice: () => g.handleDice(channel, ctx.user),
      button: () => g.handleButton(channel, ctx.user),
      fast: () => g.handleFast(channel, ctx.user),
      wheel: () => g.handleWheel(channel, ctx.user),
      hotxo: () => g.handleHotXO(channel, ctx.user, targetMember?.user ?? targetUser),
      replica: () => g.handleReplica(channel, ctx.user),
      guess: () => g.handleGuess(channel, ctx.user),
      unscramble: () => g.handleUnscramble(channel, ctx.user),
      merge: () => g.handleMerge(channel, ctx.user),
      flags: () => g.handleFlags(channel, ctx.user),
      reverse: () => g.handleReverse(channel, ctx.user),
      letter: () => g.handleLetter(channel, ctx.user),
      correct: () => g.handleCorrect(channel, ctx.user),
      order: () => g.handleOrder(channel, ctx.user),
      colors: () => g.handleColors(channel, ctx.user),
      emoji: () => g.handleEmoji(channel, ctx.user),
      reveal: () => g.handleReveal(channel, ctx.user)
    };
    const fn = map[type];
    if (fn) {
      await fn();
      await ctx.reply({ content: "تم بدء اللعبة!" });
    } else {
      await ctx.reply({ content: "لعبة غير معروفة" });
    }
  }
};

export default command;