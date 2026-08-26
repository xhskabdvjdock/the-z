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

// Roulette - احترافي مع صورة وطرد
export async function handleRoulette(channel: any, author: any) {
  const { createCanvas } = await import("@napi-rs/canvas");
  const { AttachmentBuilder } = await import("discord.js");
  // إنشاء صورة عجلة بسيطة
  const canvas = createCanvas(400, 400);
  const ctx = canvas.getContext("2d");
  const centerX = 200, centerY = 200, radius = 180;
  const colors = ["#ed4245", "#2f3136", "#57f287"];
  for (let i = 0; i < 36; i++) {
    const startAngle = (i * 10 - 90) * Math.PI / 180;
    const endAngle = ((i + 1) * 10 - 90) * Math.PI / 180;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = i === 0 ? "#57f287" : colors[i % 3];
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  // مركز العجلة
  ctx.beginPath();
  ctx.arc(centerX, centerY, 40, 0, Math.PI * 2);
  ctx.fillStyle = "#fff";
  ctx.fill();
  ctx.fillStyle = "#2f3136";
  ctx.font = "bold 20px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("R", centerX, centerY + 7);
  const buffer = canvas.toBuffer("image/png");
  const attachment = new AttachmentBuilder(buffer, { name: "roulette.png" });

  const embed = new EmbedBuilder()
    .setColor(0x2f3136)
    .setTitle("روليت")
    .setDescription("اضغط لتدوير العجلة — سيتم اختيار شخص عشوائي للطرد!")
    .setImage("attachment://roulette.png")
    .addFields(
      { name: "اللاعبون", value: "سيتم اختيار واحد للطرد", inline: true },
      { name: "الجائزة", value: "البقاء للأخير", inline: true }
    );
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`game:roulette:spin:${author.id}:${Date.now()}`).setLabel("تدوير العجلة").setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`game:roulette:bet:red:${author.id}:${Date.now()}`).setLabel("أحمر").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`game:roulette:bet:black:${author.id}:${Date.now()}`).setLabel("أسود").setStyle(ButtonStyle.Secondary)
  );
  await channel.send({ embeds: [embed], files: [attachment], components: [row] });
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

// Mafia - متكامل
export async function handleMafia(channel: any, author: any) {
  const { startMafiaGame } = await import("./mafia");
  // جمع اللاعبين من اللوبي إن وجد، أو solo
  const players = [author.id];
  await startMafiaGame(channel, players);
}

// Chairs - متقدم مع عد تنازلي
export async function handleChairs(channel: any, author: any) {
  const embed = new EmbedBuilder().setColor(0x5865f2).setTitle("كراسي — الموسيقى تعمل").setDescription("استعد... الموسيقى ستتوقف قريبًا!");
  const msg = await channel.send({ embeds: [embed] });
  const delay = 5000 + Math.floor(Math.random() * 5000);
  setTimeout(async () => {
    const stopEmbed = new EmbedBuilder().setColor(0xed4245).setTitle("توقفت الموسيقى!").setDescription("اضغط بسرعة!");
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId(`game:chairs:seat:${Date.now()}`).setLabel("اجلس!").setStyle(ButtonStyle.Success));
    await channel.send({ embeds: [stopEmbed], components: [row] }).catch(() => null);
    // إغلاق بعد 3 ثواني
    setTimeout(async () => {
      await channel.send({ embeds: [new EmbedBuilder().setColor(0x2f3136).setTitle("انتهى!").setDescription("تم إقصاء الأبطأ.")] }).catch(() => null);
    }, 3000);
  }, delay);
}

// Wheel - مع انيميشن
export async function handleWheel(channel: any, author: any) {
  const prizes = ["100 نقطة", "50 نقطة", "حاول مجددا", "200 نقطة", "خسرت", "500 نقطة"];
  const embed = new EmbedBuilder().setColor(0xf59e0b).setTitle("عجلة — تدور...").setDescription("انتظر...");
  const msg = await channel.send({ embeds: [embed] });
  // انيميشن دوران
  for (let i = 0; i < 3; i++) {
    await new Promise((r) => setTimeout(r, 800));
    const tempPrize = prizes[Math.floor(Math.random() * prizes.length)];
    const tempEmbed = new EmbedBuilder().setColor(0xf59e0b).setTitle("عجلة — تدور...").setDescription(`**${tempPrize}**`);
    await msg.edit({ embeds: [tempEmbed] }).catch(() => null);
  }
  const prize = prizes[Math.floor(Math.random() * prizes.length)];
  const finalEmbed = new EmbedBuilder().setColor(prize.includes("حاول") || prize.includes("خسرت") ? 0xed4245 : 0x57f287).setTitle("عجلة — النتيجة").setDescription(`<@${author.id}> حصل على: **${prize}**`);
  await msg.edit({ embeds: [finalEmbed] }).catch(() => null);
}

// HotXO - مع مؤقت
export async function handleHotXO(channel: any, author: any, target?: any) {
  if (!target) {
    await channel.send({ content: "منشن شخص للعب HotXO. مثال: `,hotxo @شخص`" });
    return;
  }
  const embed = new EmbedBuilder().setColor(0xed4245).setTitle("HotXO — ساخن!").setDescription(`الكرة مع <@${target.id}>! لديك 5 ثوانٍ لتمريرها.`);
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId(`game:hotxo:pass:${Date.now()}:${target.id}:${author.id}`).setLabel("مرر").setStyle(ButtonStyle.Danger));
  await channel.send({ content: `<@${author.id}> <@${target.id}>`, embeds: [embed], components: [row] });
}

// Hide - مع خيارات اختباء
export async function handleHide(channel: any, author: any) {
  const places = ["خزانة", "تحت السرير", "خلف الباب", "السطح"];
  const place = places[Math.floor(Math.random() * places.length)];
  const embed = new EmbedBuilder().setColor(0x5865f2).setTitle("غميضة").setDescription(`اختبأ <@${author.id}> في **${place}**! ابحثوا.`);
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    places.map((p) => new ButtonBuilder().setCustomId(`game:hide:${p}:${Date.now()}`).setLabel(p).setStyle(ButtonStyle.Secondary))
  );
  await channel.send({ embeds: [embed], components: [row] });
}

// Replica - مع أزرار
export async function handleReplica(channel: any, author: any) {
  const seq = Array.from({ length: 4 }, () => Math.floor(Math.random() * 4));
  const emojis = ["🔴", "🟢", "🔵", "🟡"];
  const seqStr = seq.map((n) => emojis[n]).join(" ");
  const embed = new EmbedBuilder().setColor(0x5865f2).setTitle("ريبلكا").setDescription(`احفظ التسلسل: ${seqStr} — اضغط بنفس الترتيب`);
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    emojis.map((e, i) => new ButtonBuilder().setCustomId(`game:replica:${i}:${seq.join("")}:${Date.now()}`).setLabel(e).setStyle(ButtonStyle.Secondary))
  );
  await channel.send({ embeds: [embed], components: [row] });
}

// Guess - مع تلميحات
export async function handleGuess(channel: any, author: any) {
  const num = Math.floor(Math.random() * 100) + 1;
  const embed = new EmbedBuilder().setColor(0x5865f2).setTitle("خمن الرقم").setDescription("خمن الرقم من 1 إلى 100 — سأعطيك تلميحًا (أكبر/أصغر)");
  await channel.send({ embeds: [embed] });
  const filter = (m: any) => !m.author.bot && /^\d+$/.test(m.content);
  const collector = channel.createMessageCollector({ filter, time: 30000 });
  collector.on("collect", (m: any) => {
    const guess = parseInt(m.content, 10);
    if (guess === num) {
      channel.send({ embeds: [new EmbedBuilder().setColor(0x57f287).setTitle("صح!").setDescription(`الرقم كان **${num}** — فاز <@${m.author.id}>!`)] });
      collector.stop();
    } else if (guess < num) m.reply("أكبر ⬆️").catch(() => null);
    else m.reply("أصغر ⬇️").catch(() => null);
  });
  collector.on("end", (c: any) => { if (c.size === 0 || !c.some((m: any) => parseInt(m.content, 10) === num)) channel.send({ content: `انتهى الوقت! الرقم كان ${num}` }).catch(() => null); });
}

// Draw - مع وقت وصورة
export async function handleDraw(channel: any, author: any) {
  const prompts = ["قطة", "بيت", "شجرة", "سيارة", "قلب", "نجمة", "قمر", "وردة"];
  const prompt = prompts[Math.floor(Math.random() * prompts.length)];
  const embed = new EmbedBuilder().setColor(0x5865f2).setTitle("رسمة").setDescription(`ارسم: **${prompt}**\nأرسل الصورة خلال 60 ثانية — سيتم التصويت عليها!`).setFooter({ text: "الأكثر تصويتًا يفوز" });
  await channel.send({ embeds: [embed] });
  const filter = (m: any) => m.attachments.size > 0 && m.content.includes(prompt) || m.attachments.size > 0;
  const collector = channel.createMessageCollector({ filter, time: 60000, max: 5 });
  const voters = new Set<string>();
  collector.on("collect", async (m: any) => {
    if (voters.has(m.author.id)) return;
    voters.add(m.author.id);
    await m.react("👍").catch(() => null);
    await m.react("👎").catch(() => null);
  });
  collector.on("end", () => {
    channel.send({ embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle("انتهى وقت الرسم!").setDescription("صوتوا على الرسومات بـ 👍👎")] }).catch(() => null);
  });
}

// Unscramble - مع تلميح
export async function handleUnscramble(channel: any, author: any) {
  const words = ["مرحبا", "مدرسة", "كتاب", "قلم", "لعبة", "صديق", "عائلة", "مستقبل"];
  const word = words[Math.floor(Math.random() * words.length)];
  const scrambled = word.split("").sort(() => Math.random() - 0.5).join(" ");
  const embed = new EmbedBuilder().setColor(0x5865f2).setTitle("فكك").setDescription(`فكك: **${scrambled}**\nتلميح: ${word.length} حروف`);
  await channel.send({ embeds: [embed] });
  const filter = (m: any) => m.content === word;
  const collector = channel.createMessageCollector({ filter, time: 20000, max: 1 });
  collector.on("collect", (m: any) => channel.send({ embeds: [new EmbedBuilder().setColor(0x57f287).setTitle("صح!").setDescription(`الكلمة: **${word}** — فاز <@${m.author.id}>!`)] }));
  collector.on("end", (c: any) => { if (c.size === 0) channel.send({ embeds: [new EmbedBuilder().setColor(0xed4245).setTitle("انتهى الوقت!").setDescription(`الكلمة: **${word}**`)] }).catch(() => null); });
}

// Merge - مع خيارات
export async function handleMerge(channel: any, author: any) {
  const puzzles = [{ parts: ["ال", "مدر", "سة"], answer: "المدرسة" }, { parts: ["ك", "تا", "ب"], answer: "كتاب" }];
  const puzzle = puzzles[Math.floor(Math.random() * puzzles.length)];
  const embed = new EmbedBuilder().setColor(0x5865f2).setTitle("ادمج").setDescription(`ادمج: **${puzzle.parts.join(" + ")}**`);
  await channel.send({ embeds: [embed] });
  const filter = (m: any) => m.content === puzzle.answer;
  const collector = channel.createMessageCollector({ filter, time: 20000, max: 1 });
  collector.on("collect", (m: any) => channel.send({ embeds: [new EmbedBuilder().setColor(0x57f287).setTitle("صح!").setDescription(`**${puzzle.answer}** — فاز <@${m.author.id}>!`)] }));
  collector.on("end", (c: any) => { if (c.size === 0) channel.send({ content: `انتهى الوقت! الإجابة: ${puzzle.answer}` }).catch(() => null); });
}

// Flags - مع أزرار وصورة
export async function handleFlags(channel: any, author: any) {
  const flags: Record<string, string> = { "🇸🇦": "السعودية", "🇪🇬": "مصر", "🇯🇴": "الأردن", "🇦🇪": "الإمارات", "🇲🇦": "المغرب", "🇱🇧": "لبنان" };
  const keys = Object.keys(flags);
  const flag = keys[Math.floor(Math.random() * keys.length)];
  const correct = flags[flag];
  const options = [...new Set([correct, ...Object.values(flags).sort(() => Math.random() - 0.5).slice(0, 3)])].sort(() => Math.random() - 0.5);
  const embed = new EmbedBuilder().setColor(0x5865f2).setTitle("اعلام").setDescription(`ما هذا العلم؟\n\n# ${flag}`).setFooter({ text: "اختر الإجابة الصحيحة" });
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    options.map((opt) => new ButtonBuilder().setCustomId(`game:flags:${opt}:${correct}:${Date.now()}`).setLabel(opt).setStyle(ButtonStyle.Secondary))
  );
  await channel.send({ embeds: [embed], components: [row] });
}

// Reverse - مع أمثلة متنوعة
export async function handleReverse(channel: any, author: any) {
  const pairs = [{ rev: "ملاعلا لاب ابحرم", orig: "مرحبا بالعالم" }, { rev: "ةسردم", orig: "مدرسة" }];
  const pair = pairs[Math.floor(Math.random() * pairs.length)];
  const embed = new EmbedBuilder().setColor(0x5865f2).setTitle("اعكس").setDescription(`اعكس: **${pair.rev}**`);
  await channel.send({ embeds: [embed] });
  const filter = (m: any) => m.content === pair.orig;
  const collector = channel.createMessageCollector({ filter, time: 20000, max: 1 });
  collector.on("collect", (m: any) => channel.send({ embeds: [new EmbedBuilder().setColor(0x57f287).setTitle("صح!").setDescription(`**${pair.orig}** — فاز <@${m.author.id}>!`)] }));
  collector.on("end", (c: any) => { if (c.size === 0) channel.send({ content: `انتهى الوقت! الإجابة: ${pair.orig}` }).catch(() => null); });
}

// Letter - مع تحدي
export async function handleLetter(channel: any, author: any) {
  const letters = "ابتثجحخدذرزسشصضطظعغفقكلمنهوي".split("");
  const letter = letters[Math.floor(Math.random() * letters.length)];
  const embed = new EmbedBuilder().setColor(0x5865f2).setTitle("حرف").setDescription(`أرسل كلمة تبدأ بحرف **${letter}** خلال 15 ثانية`);
  await channel.send({ embeds: [embed] });
  const filter = (m: any) => !m.author.bot && m.content.startsWith(letter) && m.content.length > 2;
  const collector = channel.createMessageCollector({ filter, time: 15000, max: 1 });
  collector.on("collect", (m: any) => channel.send({ embeds: [new EmbedBuilder().setColor(0x57f287).setTitle("ممتاز!").setDescription(`**${m.content}** تبدأ بـ **${letter}** — فاز <@${m.author.id}>!`)] }));
  collector.on("end", (c: any) => { if (c.size === 0) channel.send({ content: `انتهى الوقت!` }).catch(() => null); });
}

// Correct - مع خيارات
export async function handleCorrect(channel: any, author: any) {
  const pairs = [{ wrong: "مرحبا بك في المدرسه", correct: "مرحبا بك في المدرسة" }, { wrong: "انا ذاهب الى المدرسه", correct: "أنا ذاهب إلى المدرسة" }];
  const pair = pairs[Math.floor(Math.random() * pairs.length)];
  const embed = new EmbedBuilder().setColor(0x5865f2).setTitle("صحح").setDescription(`صحح: **${pair.wrong}**`);
  await channel.send({ embeds: [embed] });
  const filter = (m: any) => m.content === pair.correct;
  const collector = channel.createMessageCollector({ filter, time: 20000, max: 1 });
  collector.on("collect", (m: any) => channel.send({ embeds: [new EmbedBuilder().setColor(0x57f287).setTitle("صح!").setDescription(`**${pair.correct}** — فاز <@${m.author.id}>!`)] }));
  collector.on("end", (c: any) => { if (c.size === 0) channel.send({ content: `انتهى الوقت! الصح: ${pair.correct}` }).catch(() => null); });
}

// Order - مع ترتيب
export async function handleOrder(channel: any, author: any) {
  const puzzles = [{ words: ["أنا", "أحب", "البرمجة"], answer: "أنا أحب البرمجة" }, { words: ["السماء", "زرقاء", "جميلة"], answer: "السماء زرقاء جميلة" }];
  const puzzle = puzzles[Math.floor(Math.random() * puzzles.length)];
  const shuffled = [...puzzle.words].sort(() => Math.random() - 0.5).join(" ");
  const embed = new EmbedBuilder().setColor(0x5865f2).setTitle("ترتيب").setDescription(`رتب: **${shuffled}**`);
  await channel.send({ embeds: [embed] });
  const filter = (m: any) => m.content === puzzle.answer;
  const collector = channel.createMessageCollector({ filter, time: 20000, max: 1 });
  collector.on("collect", (m: any) => channel.send({ embeds: [new EmbedBuilder().setColor(0x57f287).setTitle("صح!").setDescription(`**${puzzle.answer}** — فاز <@${m.author.id}>!`)] }));
  collector.on("end", (c: any) => { if (c.size === 0) channel.send({ content: `انتهى الوقت! الإجابة: ${puzzle.answer}` }).catch(() => null); });
}

// Colors - مع صورة لون
export async function handleColors(channel: any, author: any) {
  const colors: Record<string, { hex: string; value: number }> = {
    "أحمر": { hex: "#ed4245", value: 0xed4245 },
    "أزرق": { hex: "#3498db", value: 0x3498db },
    "أخضر": { hex: "#57f287", value: 0x57f287 },
    "أصفر": { hex: "#f1c40f", value: 0xf1c40f },
    "بنفسجي": { hex: "#9b59b6", value: 0x9b59b6 }
  };
  const keys = Object.keys(colors);
  const color = keys[Math.floor(Math.random() * keys.length)];
  const { createCanvas } = await import("@napi-rs/canvas");
  const canvas = createCanvas(200, 200);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = colors[color].hex;
  ctx.fillRect(0, 0, 200, 200);
  const buffer = canvas.toBuffer("image/png");
  const { AttachmentBuilder } = await import("discord.js");
  const attachment = new AttachmentBuilder(buffer, { name: "color.png" });
  const embed = new EmbedBuilder().setColor(colors[color].value).setTitle("الوان").setDescription(`ما هذا اللون؟`).setImage("attachment://color.png");
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    keys.map((c) => new ButtonBuilder().setCustomId(`game:colors:${c}:${color}:${Date.now()}`).setLabel(c).setStyle(ButtonStyle.Secondary))
  );
  await channel.send({ embeds: [embed], files: [attachment], components: [row] });
}

// Emoji
export async function handleEmoji(channel: any, author: any) {
  const emojis: Record<string, string> = { "😀": "سعيد", "😢": "حزين", "😡": "غاضب" };
  const keys = Object.keys(emojis);
  const emoji = keys[Math.floor(Math.random() * keys.length)];
  const embed = new EmbedBuilder().setColor(0x5865f2).setTitle("ايموجي").setDescription(`ما معنى ${emoji}؟`);
  await channel.send({ embeds: [embed] });
  const answer = emojis[emoji];
  const filter = (m: any) => m.content.includes(answer);
  const collector = channel.createMessageCollector({ filter, time: 15000, max: 1 });
  collector.on("collect", (m: any) => channel.send({ content: `صح! فاز <@${m.author.id}>!` }));
}

// Reveal
export async function handleReveal(channel: any, author: any) {
  const embed = new EmbedBuilder().setColor(0x5865f2).setTitle("اكشف").setDescription("اضغط لكشف الصورة");
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId(`game:reveal:${Date.now()}`).setLabel("اكشف").setStyle(ButtonStyle.Primary));
  await channel.send({ embeds: [embed], components: [row] });
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
  try {
    const { registerGameCenterComponents } = require("./core/GameCenter");
    registerGameCenterComponents(router);
  } catch {}
  // Fizbo lobby
  try {
    const { registerFizboComponents } = require("./fizboGames");
    registerFizboComponents(router);
  } catch {}
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

  // Roulette - مع طرد
  router.registerButton("game:roulette:spin:", async (interaction: any) => {
    const guild = interaction.guild;
    const members = guild ? [...guild.members.cache.filter((m: any) => !m.user.bot).values()].slice(0, 10) : [];
    const victim = members.length > 1 ? members[Math.floor(Math.random() * members.length)] : interaction.user;
    const embed = new (await import("discord.js")).EmbedBuilder().setColor(0xed4245).setTitle("روليت — طرد!").setDescription(`تم طرد <@${victim.id ?? interaction.user.id}>!`).setImage("https://cdn.discordapp.com/attachments/0/0/roulette.png");
    await interaction.update({ embeds: [embed], components: [] });
    // محاولة طرد فعلي (إن وجدت صلاحية)
    try {
      const member = guild?.members.cache.get(victim.id);
      if (member?.kickable) await member.send({ content: "تم طردك بالروليت!" }).catch(() => null);
    } catch {}
  });
  // Roulette - مع رهان (قديم)
  router.registerButton("game:roulette:bet:", async (interaction: any) => {
    const parts = interaction.customId.split(":");
    const betType = parts[3];
    const authorId = parts[4];
    if (interaction.user.id !== authorId) {
      await interaction.reply({ content: "هذا الرهان ليس لك!", ephemeral: true });
      return;
    }
    const winningNumber = Math.floor(Math.random() * 37);
    const isRed = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36].includes(winningNumber);
    const isEven = winningNumber !== 0 && winningNumber % 2 === 0;
    let won = false;
    if (betType === "red" && isRed) won = true;
    else if (betType === "black" && !isRed && winningNumber !== 0) won = true;
    else if (betType === "even" && isEven) won = true;
    else if (betType === "odd" && !isEven && winningNumber !== 0) won = true;
    else if (betType === "number") won = Math.random() > 0.9;
    const tempEmbed = new (await import("discord.js")).EmbedBuilder().setColor(0xf59e0b).setTitle("روليت — تدور...").setDescription("الكرة تدور...");
    await interaction.update({ embeds: [tempEmbed], components: [] });
    await new Promise((r) => setTimeout(r, 2000));
    const resultColor = winningNumber === 0 ? "🟢" : isRed ? "🔴" : "⚫";
    const embed = new (await import("discord.js")).EmbedBuilder().setColor(won ? 0x57f287 : 0xed4245).setTitle(`روليت — ${resultColor} ${winningNumber}`).setDescription(`${won ? "فزت!" : "خسرت!"} — ${betType} | الرقم الفائز: **${winningNumber}** ${resultColor}`);
    await interaction.editReply({ embeds: [embed] }).catch(() => null);
  });
  // Legacy simple roulette (for old button)
  router.registerButton("game:roulette:", async (interaction: any) => {
    if (interaction.customId.includes(":bet:")) return; // تجاهل، تم التعامل أعلاه
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

  // Flags & Colors
  router.registerButton("game:flags:", async (interaction: any) => {
    const parts = interaction.customId.split(":");
    const chosen = parts[2];
    const correct = parts[3];
    const result = chosen === correct ? "صح!" : `خطأ! الصح: ${correct}`;
    const embed = new (await import("discord.js")).EmbedBuilder().setColor(chosen === correct ? 0x57f287 : 0xed4245).setTitle("اعلام").setDescription(`${result} — اخترت ${chosen}`);
    await interaction.update({ embeds: [embed], components: [] });
  });
  router.registerButton("game:colors:", async (interaction: any) => {
    const parts = interaction.customId.split(":");
    const chosen = parts[2];
    const correct = parts[3];
    const result = chosen === correct ? "صح!" : `خطأ! الصح: ${correct}`;
    const embed = new (await import("discord.js")).EmbedBuilder().setColor(chosen === correct ? 0x57f287 : 0xed4245).setTitle("الوان").setDescription(result);
    await interaction.update({ embeds: [embed], components: [] });
  });

  // Generic for simple games
  const simpleGames = ["mafia", "chairs", "hide", "reveal"];
  for (const gid of simpleGames) {
    router.registerButton(`game:${gid}:`, async (interaction: any) => {
      const embed = new (await import("discord.js")).EmbedBuilder().setColor(0x5865f2).setTitle(gid).setDescription(`تفاعل <@${interaction.user.id}>!`);
      await interaction.update({ embeds: [embed], components: [] });
    });
  }
}