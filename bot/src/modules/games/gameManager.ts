import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import { getGuildConfig } from "../../utils/guildConfig";

// حالة الألعاب في الذاكرة
const activeGames = new Map<string, any>();

export interface GameConfig {
  enabled: boolean;
  command: string;
}

export function getGameConfig(gConfig: any, gameId: string): GameConfig {
  const games = gConfig?.games?.games ?? {};
  const defaults: Record<string, string> = {
    roulette: "roulette", xo: "xo", mafia: "mafia", chairs: "chairs", rps: "rps",
    dice: "dice", wheel: "wheel", hotxo: "hotxo", hide: "hide", replica: "replica",
    guess: "guess", draw: "draw", button: "button", fast: "fast", unscramble: "unscramble",
    merge: "merge", flags: "flags", reverse: "reverse", letter: "letter", correct: "correct",
    order: "order", colors: "colors", emoji: "emoji", reveal: "reveal"
  };
  const cfg = games[gameId];
  if (!cfg) return { enabled: true, command: defaults[gameId] ?? gameId };
  return cfg;
}

export function isGameEnabled(gConfig: any, gameId: string): boolean {
  if (!gConfig?.games?.enabled) return false;
  return getGameConfig(gConfig, gameId).enabled;
}

// XO Game
export async function handleXO(channel: any, author: any, target?: any) {
  if (!target) {
    await channel.send({ content: "منشن شخص لتلعب معه. مثال: `,xo @شخص`" });
    return;
  }
  if (target.id === author.id) {
    await channel.send({ content: "لا يمكنك اللعب مع نفسك!" });
    return;
  }

  const board = Array(9).fill(null);
  let turn = author.id;
  const gameId = `xo:${channel.id}:${Date.now()}`;

  const renderBoard = () => {
    const rows = [];
    for (let r = 0; r < 3; r++) {
      const row = new ActionRowBuilder<ButtonBuilder>();
      for (let c = 0; c < 3; c++) {
        const idx = r * 3 + c;
        const val = board[idx];
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`game:xo:${gameId}:${idx}`)
            .setLabel(val ?? " ")
            .setStyle(val === "X" ? ButtonStyle.Danger : val === "O" ? ButtonStyle.Primary : ButtonStyle.Secondary)
            .setDisabled(!!val)
        );
      }
      rows.push(row);
    }
    return rows;
  };

  const checkWin = () => {
    const wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    for (const [a,b,c] of wins) {
      if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
    }
    return board.every((v) => v) ? "draw" : null;
  };

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("اكس او")
    .setDescription(`دور <@${turn}>`);

  const msg = await channel.send({ content: `<@${author.id}> <@${target.id}>`, embeds: [embed], components: renderBoard() });
  activeGames.set(gameId, { board, turn, author, target, msg, channel, renderBoard, checkWin, embed });
}

// Roulette
export async function handleRoulette(channel: any, author: any) {
  const embed = new EmbedBuilder().setColor(0x5865f2).setTitle("روليت").setDescription("اضغط لتدوير");
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`game:roulette:${Date.now()}`).setLabel("تدوير").setStyle(ButtonStyle.Primary)
  );
  await channel.send({ embeds: [embed], components: [row] });
}

// RPS
export async function handleRPS(channel: any, author: any, target?: any) {
  const choices = ["حجرة", "ورقة", "مقص"];
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    choices.map((c) => new ButtonBuilder().setCustomId(`game:rps:${c}:${author.id}:${target?.id ?? "bot"}`).setLabel(c).setStyle(ButtonStyle.Secondary))
  );
  const embed = new EmbedBuilder().setColor(0x5865f2).setTitle("حجرة ورقة مقص").setDescription(target ? `بين <@${author.id}> و <@${target.id}>` : `اختر:`);
  await channel.send({ embeds: [embed], components: [row] });
}

// Dice
export async function handleDice(channel: any, author: any) {
  const roll = Math.floor(Math.random() * 6) + 1;
  const embed = new EmbedBuilder().setColor(0x5865f2).setTitle("نرد").setDescription(`<@${author.id}> رمى النرد: **${roll}**`);
  await channel.send({ embeds: [embed] });
}

// Button
export async function handleButton(channel: any, author: any) {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`game:button:${Date.now()}:${author.id}`).setLabel("اضغط").setStyle(ButtonStyle.Success)
  );
  const embed = new EmbedBuilder().setColor(0x5865f2).setTitle("زر").setDescription("أسرع من يضغط!");
  await channel.send({ embeds: [embed], components: [row] });
}

// Fast
export async function handleFast(channel: any, author: any) {
  const words = ["مرحبا", "سرعة", "تحدي", "ذكاء", "لعبة"];
  const word = words[Math.floor(Math.random() * words.length)];
  const embed = new EmbedBuilder().setColor(0x5865f2).setTitle("اسرع").setDescription(`اكتب: **${word}**`);
  await channel.send({ embeds: [embed] });
  const filter = (m: any) => m.content === word;
  const collector = channel.createMessageCollector({ filter, time: 15000, max: 1 });
  collector.on("collect", (m: any) => {
    channel.send({ content: `فاز <@${m.author.id}>!` });
  });
  collector.on("end", (collected: any) => {
    if (collected.size === 0) channel.send({ content: "انتهى الوقت!" });
  });
}

export function getActiveGame(id: string) {
  return activeGames.get(id);
}

export function setActiveGame(id: string, data: any) {
  activeGames.set(id, data);
}

export function deleteActiveGame(id: string) {
  activeGames.delete(id);
}

export function registerGameComponents(router: any) {
  // XO
  router.registerButton("game:xo:", async (interaction: any) => {
    const parts = interaction.customId.split(":");
    const gameId = parts.slice(2, -1).join(":");
    const idx = parseInt(parts[parts.length - 1], 10);
    const game = activeGames.get(gameId);
    if (!game) {
      await interaction.reply({ content: "اللعبة انتهت.", ephemeral: true });
      return;
    }
    if (interaction.user.id !== game.turn) {
      await interaction.reply({ content: "ليس دورك!", ephemeral: true });
      return;
    }
    if (game.board[idx]) {
      await interaction.reply({ content: "الخانة مشغولة!", ephemeral: true });
      return;
    }
    const mark = game.turn === game.author.id ? "X" : "O";
    game.board[idx] = mark;
    const win = game.checkWin();
    if (win) {
      const desc = win === "draw" ? "تعادل!" : `فاز <@${game.turn}>!`;
      const embed = new (await import("discord.js")).EmbedBuilder().setColor(0x5865f2).setTitle("اكس او").setDescription(desc);
      await interaction.update({ embeds: [embed], components: [] });
      activeGames.delete(gameId);
      return;
    }
    game.turn = game.turn === game.author.id ? game.target.id : game.author.id;
    const embed = new (await import("discord.js")).EmbedBuilder().setColor(0x5865f2).setTitle("اكس او").setDescription(`دور <@${game.turn}>`);
    await interaction.update({ embeds: [embed], components: game.renderBoard() });
  });

  // Roulette
  router.registerButton("game:roulette:", async (interaction: any) => {
    const result = Math.random() > 0.5 ? "فزت!" : "خسرت!";
    const embed = new (await import("discord.js")).EmbedBuilder().setColor(result === "فزت!" ? 0x57f287 : 0xed4245).setTitle("روليت").setDescription(`<@${interaction.user.id}> ${result}`);
    await interaction.update({ embeds: [embed], components: [] });
  });

  // RPS
  router.registerButton("game:rps:", async (interaction: any) => {
    const parts = interaction.customId.split(":");
    const choice = parts[2];
    const authorId = parts[3];
    const targetId = parts[4];
    const choices = ["حجرة", "ورقة", "مقص"];
    const botChoice = choices[Math.floor(Math.random() * 3)];
    let result = "";
    if (choice === botChoice) result = "تعادل!";
    else if ((choice === "حجرة" && botChoice === "مقص") || (choice === "ورقة" && botChoice === "حجرة") || (choice === "مقص" && botChoice === "ورقة")) result = `فاز <@${interaction.user.id}>!`;
    else result = `فاز البوت!`;
    const embed = new (await import("discord.js")).EmbedBuilder().setColor(0x5865f2).setTitle("حجرة ورقة مقص").setDescription(`اخترت ${choice}، البوت اختار ${botChoice} — ${result}`);
    await interaction.update({ embeds: [embed], components: [] });
  });

  // Button
  router.registerButton("game:button:", async (interaction: any) => {
    const embed = new (await import("discord.js")).EmbedBuilder().setColor(0x57f287).setTitle("زر").setDescription(`فاز <@${interaction.user.id}> لأنه الأسرع!`);
    await interaction.update({ embeds: [embed], components: [] });
  });
}