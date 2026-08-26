import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";

export interface FizboLobby {
  channelId: string;
  guildId: string;
  gameId: string;
  hostId: string;
  players: string[];
  state: "waiting" | "playing" | "finished";
  messageId?: string;
  createdAt: number;
}

const lobbies = new Map<string, FizboLobby>(); // key: channelId

export function getLobby(channelId: string): FizboLobby | undefined {
  return lobbies.get(channelId);
}

export function createLobby(channelId: string, guildId: string, gameId: string, hostId: string): FizboLobby | null {
  if (lobbies.has(channelId)) return null;
  const lobby: FizboLobby = {
    channelId, guildId, gameId, hostId,
    players: [hostId],
    state: "waiting",
    createdAt: Date.now()
  };
  lobbies.set(channelId, lobby);
  // حذف تلقائي بعد 5 دقائق بدون بدء
  setTimeout(() => {
    const l = lobbies.get(channelId);
    if (l && l.state === "waiting") lobbies.delete(channelId);
  }, 5 * 60 * 1000);
  return lobby;
}

export function joinLobby(channelId: string, userId: string): boolean {
  const lobby = lobbies.get(channelId);
  if (!lobby || lobby.state !== "waiting") return false;
  if (lobby.players.includes(userId)) return false;
  if (lobby.players.length >= 10) return false;
  lobby.players.push(userId);
  return true;
}

export function leaveLobby(channelId: string, userId: string): boolean {
  const lobby = lobbies.get(channelId);
  if (!lobby || lobby.state !== "waiting") return false;
  lobby.players = lobby.players.filter((id) => id !== userId);
  if (lobby.players.length === 0) lobbies.delete(channelId);
  else if (lobby.hostId === userId) lobby.hostId = lobby.players[0];
  return true;
}

export function startLobby(channelId: string): FizboLobby | null {
  const lobby = lobbies.get(channelId);
  if (!lobby || lobby.state !== "waiting" || lobby.players.length < 2) return null;
  lobby.state = "playing";
  return lobby;
}

export function endLobby(channelId: string) {
  lobbies.delete(channelId);
}

export function buildLobbyEmbed(lobby: FizboLobby, gameName: string): EmbedBuilder {
  const playerList = lobby.players.map((id, i) => `${i + 1}. <@${id}>${id === lobby.hostId ? " (المضيف)" : ""}`).join("\n");
  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(`${gameName} — اللوبي`)
    .setDescription(`**اللاعبون (${lobby.players.length}/10):**\n${playerList}`)
    .setFooter({ text: lobby.state === "waiting" ? "اضغط انضمام للانضمام" : "اللعبة بدأت" });
}

export function buildLobbyRow(lobby: FizboLobby): ActionRowBuilder<ButtonBuilder> {
  const row = new ActionRowBuilder<ButtonBuilder>();
  if (lobby.state === "waiting") {
    row.addComponents(
      new ButtonBuilder().setCustomId(`fizbo:join:${lobby.channelId}`).setLabel("انضمام").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`fizbo:leave:${lobby.channelId}`).setLabel("خروج").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`fizbo:start:${lobby.channelId}`).setLabel("بدء").setStyle(ButtonStyle.Primary)
    );
  }
  return row;
}