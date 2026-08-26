import { EmbedBuilder } from "discord.js";
import { getLobby, joinLobby, leaveLobby, startLobby, buildLobbyEmbed, buildLobbyRow, endLobby } from "./fizboLobby";

const GAME_NAMES: Record<string, string> = {
  mafia: "مافيا",
  roulette: "روليت",
  hide: "غميضة",
  chairs: "كراسي",
  draw: "رسمة"
};

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

    // بدء اللعبة — جولات إقصاء عشوائية
    await interaction.update({
      embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle(`${GAME_NAMES[lobby.gameId]} — بدأت!`).setDescription(`اللاعبون: ${lobby.players.map((id) => `<@${id}>`).join(", ")}`)],
      components: []
    });

    // محاكاة جولات
    let remaining = [...lobby.players];
    const channel = interaction.channel;
    for (let round = 1; remaining.length > 1; round++) {
      await new Promise((r) => setTimeout(r, 3000));
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
  const row = buildLobbyRow(lobby);
  const msg = await channel.send({ embeds: [embed], components: [row] });
  lobby.messageId = msg.id;
}