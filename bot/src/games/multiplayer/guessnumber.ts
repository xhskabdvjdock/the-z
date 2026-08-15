import { EmbedBuilder, Message } from "discord.js";
import { GameDefinition, GameSession } from "../core/types";

const ROUND_TIME = 30_000;
const MAX_EMPTY = 15;

const def: GameDefinition<{
  target: number;
  min: number;
  max: number;
  emptyCount: number;
}> = {
  name: "guessnumber",
  aliases: ["guess-number", "gn", "خمّن-الرقم"],
  title: "خمّن الرقم",
  description: "خمّن الرقم السري بين 1 و100 — أعلى/أقل حتى تصيب.",
  instructions:
    "البوت يخفي رقمًا سريًا.\n" +
    "اكتب تخمينًا في الشات وسيخبرك البوت إذا كان الرقم أعلى أو أقل.\n" +
    "أول من يخمّن الرقم الصحيح يفوز.",
  category: "multiplayer",
  minPlayers: 2,
  maxPlayers: 10,
  durationLabel: "دقائق قليلة",
  cooldownSeconds: 3,

  async parseArgs(args, session) {
    let max = 100;
    const arg = Number(args[0]);
    if (args[0] && !Number.isNaN(arg) && arg > 10 && arg <= 1000) {
      max = arg;
    }
    session.gameData = {
      target: 1 + Math.floor(Math.random() * max),
      min: 1,
      max,
      emptyCount: 0
    };
    return null;
  },

  async onStart(session) {
    session.phase = "playing";
    await session.renderNow();
    await runGuessLoop(session);
  },

  onAction() {
    /* إجابات نصية */
  },

  render(session) {
    const data = session.gameData;
    const embed = new EmbedBuilder()
      .setTitle("خمّن الرقم")
      .setDescription(
        `الرقم السري بين **${data.min}** و **${data.max}**.\n\n` +
          "اكتب تخمينك في الشات وسيظهر تلميح أعلى/أقل."
      );
    return { embeds: [embed], rows: [] };
  }
};

async function runGuessLoop(session: GameSession): Promise<void> {
  const data = session.gameData as { target: number; min: number; max: number; emptyCount: number };
  const playerIds = new Set(session.players.map((p) => p.id));

  while (session.status === "PLAYING") {
    const messages = await session.awaitText({
      time: ROUND_TIME,
      max: 1,
      filter: (m: Message) => playerIds.has(m.author.id)
    });
    if (session.status !== "PLAYING") return;

    if (!messages.length) {
      data.emptyCount += 1;
      if (data.emptyCount >= MAX_EMPTY) {
        await session.expire("انتهت مهلة اللعبة بسبب عدم وجود تخمينات.");
        return;
      }
      await session.notify("لا تخمينات — الرقم ما زال مخفيًا.").catch(() => null);
      continue;
    }

    const guess = Number(messages[0].content.trim());
    if (Number.isNaN(guess) || !Number.isInteger(guess)) {
      await session.notify("اكتب رقمًا صحيحًا فقط.").catch(() => null);
      continue;
    }

    if (guess === data.target) {
      const scores: Record<string, number> = {};
      for (const p of session.players) scores[p.id] = 0;
      scores[messages[0].author.id] = 1;
      await session.finish({
        winners: [messages[0].author.id],
        scores,
        summary: `<@${messages[0].author.id}> خمّن الرقم **${data.target}**!`
      });
      return;
    }

    data.emptyCount = 0;
    await session.notify(
      guess < data.target ? "الرقم **أعلى** من تخمينك." : "الرقم **أقل** من تخمينك."
    ).catch(() => null);
  }
}

export default def;