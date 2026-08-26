import { AttachmentBuilder, EmbedBuilder } from "discord.js";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { getLobby, joinLobby, leaveLobby, startLobby, buildLobbyEmbed, buildLobbyRow, endLobby } from "./fizboLobby";

const GAME_NAMES: Record<string, string> = {
  mafia: "مافيا",
  roulette: "روليت",
  hide: "غميضة",
  chairs: "كراسي",
  draw: "رسمة"
};

const GAME_IMAGES: Record<string, string> = {
  mafia: "https://cdn.discordapp.com/attachments/0/0/mafia.png",
  roulette: "https://cdn.discordapp.com/attachments/0/0/roulette.png",
  hide: "https://cdn.discordapp.com/attachments/0/0/hide.png"
};

async function generateRouletteImage(): Promise<Buffer> {
  const canvas = createCanvas(600, 400);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(0, 0, 600, 400);
  const centerX = 200, centerY = 200, radius = 150;
  const colors = ["#ed4245", "#2f3136"];
  for (let i = 0; i < 36; i++) {
    const startAngle = (i * 10 - 90) * Math.PI / 180;
    const endAngle = ((i + 1) * 10 - 90) * Math.PI / 180;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = i === 0 ? "#57f287" : colors[i % 2];
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1;
    ctx.stroke();
    if (i % 6 === 0) {
      const angle = (i * 10 - 85) * Math.PI / 180;
      const x = centerX + Math.cos(angle) * (radius - 30);
      const y = centerY + Math.sin(angle) * (radius - 30);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(String(i), x, y);
    }
  }
  ctx.beginPath();
  ctx.arc(centerX, centerY, 50, 0, Math.PI * 2);
  ctx.fillStyle = "#fff";
  ctx.fill();
  ctx.fillStyle = "#1a1a2e";
  ctx.font = "bold 24px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("ROULETTE", centerX, centerY + 8);
  ctx.fillStyle = "#0f3460";
  ctx.fillRect(400, 50, 180, 300);
  ctx.strokeStyle = "#fff";
  ctx.strokeRect(400, 50, 180, 300);
  ctx.fillStyle = "#fff";
  ctx.font = "12px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("RED | BLACK", 490, 80);
  ctx.fillText("EVEN | ODD", 490, 120);
  ctx.fillText("1-18 | 19-36", 490, 160);
  return canvas.toBuffer("image/png");
}

async function generateRouletteGif(winnerName: string): Promise<Buffer> {
  // @ts-ignore
  const GIFEncoder = (await import("gif-encoder-2")).default;
  const canvas = createCanvas(600, 400);
  const ctx = canvas.getContext("2d") as any;
  const encoder = new GIFEncoder(600, 400);
  encoder.setDelay(80);
  encoder.setRepeat(0);
  encoder.start();
  const frames = 24;
  for (let f = 0; f < frames; f++) {
    const rotation = (f / frames) * 720; // دورتان
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, 600, 400);
    const centerX = 300, centerY = 200, radius = 150;
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-centerX, -centerY);
    const colors = ["#ed4245", "#2f3136"];
    for (let i = 0; i < 36; i++) {
      const startAngle = (i * 10 - 90) * Math.PI / 180;
      const endAngle = ((i + 1) * 10 - 90) * Math.PI / 180;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = i === 0 ? "#57f287" : colors[i % 2];
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(centerX, centerY, 50, 0, Math.PI * 2);
    ctx.fillStyle = "#fff";
    ctx.fill();
    ctx.restore();
    // مؤشر
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.moveTo(centerX, 30);
    ctx.lineTo(centerX - 10, 50);
    ctx.lineTo(centerX + 10, 50);
    ctx.closePath();
    ctx.fill();
    // نص
    ctx.fillStyle = "#fff";
    ctx.font = "bold 18px sans-serif";
    ctx.textAlign = "center";
    if (f === frames - 1) {
      ctx.fillText(`الفائز: ${winnerName}`, 300, 380);
    } else {
      ctx.fillText("تدور...", 300, 380);
    }
    encoder.addFrame(ctx as any);
  }
  encoder.finish();
  return encoder.out.getData();
}

export function registerFizboComponents(router: any) {
  router.registerButton("fizbo:join:", async (interaction: any) => {
    const channelId = interaction.customId.split(":")[2];
    const lobby = getLobby(channelId);
    if (!lobby) {
      await interaction.reply({ content: "لا يوجد لوبي نشط.", ephemeral: true });
      return;
    }
    if (joinLobby(channelId, interaction.user.id)) {
      const embed = buildLobbyEmbed(lobby, GAME_NAMES[lobby.gameId] ?? lobby.gameId);
      await interaction.update({ embeds: [embed], components: [buildLobbyRow(lobby)] });
    } else {
      await interaction.reply({ content: "لا يمكنك الانضمام.", ephemeral: true });
    }
  });

  router.registerButton("fizbo:leave:", async (interaction: any) => {
    const channelId = interaction.customId.split(":")[2];
    if (leaveLobby(channelId, interaction.user.id)) {
      const lobby = getLobby(channelId);
      if (lobby) {
        const embed = buildLobbyEmbed(lobby, GAME_NAMES[lobby.gameId] ?? lobby.gameId);
        await interaction.update({ embeds: [embed], components: [buildLobbyRow(lobby)] });
      } else {
        await interaction.update({ content: "تم إغلاق اللوبي.", embeds: [], components: [] });
      }
    } else {
      await interaction.reply({ content: "لست في اللوبي.", ephemeral: true });
    }
  });

  router.registerButton("fizbo:cancel:", async (interaction: any) => {
    const channelId = interaction.customId.split(":")[2];
    const { cancelLobby } = await import("./fizboLobby");
    if (cancelLobby(channelId, interaction.user.id)) {
      await interaction.update({ content: "تم إلغاء اللوبي.", embeds: [], components: [] });
    } else {
      await interaction.reply({ content: "المضيف فقط يمكنه الإلغاء.", ephemeral: true });
    }
  });

  router.registerButton("fizbo:start:", async (interaction: any) => {
    const channelId = interaction.customId.split(":")[2];
    const lobby = getLobby(channelId);
    if (!lobby) {
      await interaction.reply({ content: "لا يوجد لوبي.", ephemeral: true });
      return;
    }
    if (lobby.hostId !== interaction.user.id) {
      await interaction.reply({ content: "المضيف فقط يمكنه البدء.", ephemeral: true });
      return;
    }
    const started = startLobby(channelId);
    if (!started) {
      await interaction.reply({ content: "تحتاج لاعبين على الأقل (2).", ephemeral: true });
      return;
    }

    if (lobby.gameId === "roulette") {
      const buffer = await generateRouletteImage().catch(() => null);
      const attachment = buffer ? new AttachmentBuilder(buffer, { name: "roulette.png" }) : null;
      await interaction.update({
        embeds: [new EmbedBuilder().setColor(0x2f3136).setTitle("روليت — بدأت!").setDescription(`اللاعبون: ${lobby.players.map((id) => `<@${id}>`).join(", ")}\n\nالعجلة ستدور لاختيار من يُطرد...`).setImage(attachment ? "attachment://roulette.png" : null)],
        files: attachment ? [attachment] : [],
        components: []
      });
      await new Promise((r) => setTimeout(r, 2000));
      let remaining = [...lobby.players];
      for (let round = 1; remaining.length > 1; round++) {
        const eliminated = remaining.splice(Math.floor(Math.random() * remaining.length), 1)[0];
        try {
          const member = await interaction.guild.members.fetch(eliminated).catch(() => null);
          const name = member?.displayName ?? member?.user.username ?? eliminated;
          const gifBuffer = await generateRouletteGif(name).catch(() => null);
          const gifAttachment = gifBuffer ? new AttachmentBuilder(gifBuffer as any, { name: "spin.gif" }) : null;
          const embed = new EmbedBuilder()
            .setColor(0xed4245)
            .setTitle(`الجولة ${round} — العجلة تدور`)
            .setDescription(`تم طرد <@${eliminated}>`)
            .setImage(gifAttachment ? "attachment://spin.gif" : null);
          await interaction.channel.send({ embeds: [embed], files: gifAttachment ? [gifAttachment] : [] }).catch(() => null);
        } catch {
          const embed = new EmbedBuilder().setColor(0xed4245).setTitle(`الجولة ${round} — طرد`).setDescription(`تم طرد <@${eliminated}>\nالمتبقي: ${remaining.map((id) => `<@${id}>`).join(", ")}`);
          await interaction.channel.send({ embeds: [embed] }).catch(() => null);
        }
        await new Promise((r) => setTimeout(r, 1500));
      }
      const winner = remaining[0];
      const winEmbed = new EmbedBuilder().setColor(0x57f287).setTitle("الفائز!").setDescription(`فاز <@${winner}> بالروليت!`);
      await interaction.channel.send({ embeds: [winEmbed] }).catch(() => null);
      endLobby(channelId);
      return;
    }

    // باقي الألعاب — نفس النظام القديم لكن بتحسين
    await interaction.update({
      embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle(`${GAME_NAMES[lobby.gameId]} — بدأت!`).setDescription(`اللاعبون: ${lobby.players.map((id) => `<@${id}>`).join(", ")}`)],
      components: []
    });

    let remaining = [...lobby.players];
    const channel = interaction.channel;
    for (let round = 1; remaining.length > 1; round++) {
      await new Promise((r) => setTimeout(r, 2500));
      const eliminated = remaining.splice(Math.floor(Math.random() * remaining.length), 1)[0];
      const embed = new EmbedBuilder()
        .setColor(0xed4245)
        .setTitle(`الجولة ${round} — إقصاء`)
        .setDescription(`تم إقصاء <@${eliminated}> — المتبقي: ${remaining.map((id) => `<@${id}>`).join(", ")}`);
      await channel.send({ embeds: [embed] }).catch(() => null);
    }

    const winner = remaining[0];
    const winEmbed = new EmbedBuilder().setColor(0x57f287).setTitle("الفائز!").setDescription(`فاز <@${winner}>!`);
    await channel.send({ embeds: [winEmbed] }).catch(() => null);
    endLobby(channelId);
  });
}

export async function startFizboGame(channel: any, gameId: string, hostId: string, guildId: string) {
  const { createLobby, buildLobbyEmbed, buildLobbyRow } = await import("./fizboLobby");
  if (channel.isThread?.() || channel.isVoiceBased?.()) {
    await channel.send({ content: "هذه اللعبة تحتاج قناة نصية." });
    return;
  }
  const existing = getLobby(channel.id);
  if (existing) {
    await channel.send({ content: "يوجد لعبة نشطة بالفعل في هذه القناة." });
    return;
  }
  const lobby = createLobby(channel.id, guildId, gameId, hostId);
  if (!lobby) {
    await channel.send({ content: "فشل إنشاء اللوبي." });
    return;
  }
  const embed = buildLobbyEmbed(lobby, GAME_NAMES[gameId] ?? gameId);
  // إضافة صورة للعبة
  if (gameId === "roulette") {
    const buffer = await generateRouletteImage().catch(() => null);
    if (buffer) {
      const attachment = new AttachmentBuilder(buffer, { name: "lobby.png" });
      embed.setImage("attachment://lobby.png");
      const row = buildLobbyRow(lobby);
      const msg = await channel.send({ embeds: [embed], files: [attachment], components: [row] });
      lobby.messageId = msg.id;
      return;
    }
  }
  const row = buildLobbyRow(lobby);
  const msg = await channel.send({ embeds: [embed], components: [row] });
  lobby.messageId = msg.id;
}