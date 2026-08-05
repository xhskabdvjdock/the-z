const API_BASE = "https://discord.com/api/v10";
const ADMINISTRATOR = 0x8n;

export function botHeaders() {
  return { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` };
}

export interface DiscordGuildSummary {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
}

export interface ManageableGuild {
  id: string;
  name: string;
  iconUrl: string | null;
  botIn: boolean;
}

export interface DiscordChannel {
  id: string;
  name: string;
  type: number;
  parent_id: string | null;
  position: number;
  topic: string | null;
  nsfw: boolean;
  rate_limit_per_user: number;
  permission_overwrites?: Array<{
    id: string;
    type: number;
    allow: bigint;
    deny: bigint;
  }>;
}

export interface DiscordRole {
  id: string;
  name: string;
  color: number;
  position: number;
  managed: boolean;
  hoist: boolean;
  mentionable: boolean;
  permissions: string;
}

export function guildIconUrl(id: string, icon: string | null) {
  if (!icon) return null;
  const ext = icon.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/icons/${id}/${icon}.${ext}?size=128`;
}

export function hasAdminPermission(permissions: string) {
  try {
    return (BigInt(permissions) & ADMINISTRATOR) === ADMINISTRATOR;
  } catch {
    return false;
  }
}

/** يجلب سيرفرات المستخدم من Discord عبر التوكن الخاص به (OAuth2) */
export async function getUserGuilds(accessToken: string): Promise<DiscordGuildSummary[]> {
  const res = await fetch(`${API_BASE}/users/@me/guilds`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store"
  });
  if (!res.ok) return [];
  return res.json();
}

/** يجلب قائمة آيديات السيرفرات التي يوجد بها البوت حالياً */
export async function getBotGuildIds(): Promise<Set<string>> {
  const res = await fetch(`${API_BASE}/users/@me/guilds?limit=200`, {
    headers: botHeaders(),
    cache: "no-store"
  });
  if (!res.ok) return new Set();
  const data: { id: string }[] = await res.json();
  return new Set(data.map((g) => g.id));
}

/** يعيد قائمة السيرفرات التي يملك فيها المستخدم صلاحية Administrator، مع توضيح هل البوت موجود بها */
export async function getManageableGuilds(accessToken: string): Promise<ManageableGuild[]> {
  const [userGuilds, botGuildIds] = await Promise.all([
    getUserGuilds(accessToken),
    getBotGuildIds()
  ]);

  return userGuilds
    .filter((g) => g.owner || hasAdminPermission(g.permissions))
    .map((g) => ({
      id: g.id,
      name: g.name,
      iconUrl: guildIconUrl(g.id, g.icon),
      botIn: botGuildIds.has(g.id)
    }));
}

export async function assertGuildAccess(accessToken: string, guildId: string): Promise<boolean> {
  const guilds = await getUserGuilds(accessToken);
  const target = guilds.find((g) => g.id === guildId);
  if (!target) return false;
  return target.owner || hasAdminPermission(target.permissions);
}

export async function getGuildInfo(guildId: string) {
  const res = await fetch(`${API_BASE}/guilds/${guildId}?with_counts=true`, {
    headers: botHeaders(),
    cache: "no-store"
  });
  if (!res.ok) return null;
  return res.json();
}

export async function getGuildChannels(guildId: string): Promise<DiscordChannel[]> {
  const res = await fetch(`${API_BASE}/guilds/${guildId}/channels`, {
    headers: botHeaders(),
    cache: "no-store"
  });
  if (!res.ok) return [];
  const channels: DiscordChannel[] = await res.json();
  return channels.sort((a, b) => a.position - b.position);
}

export async function getGuildRoles(guildId: string): Promise<DiscordRole[]> {
  const res = await fetch(`${API_BASE}/guilds/${guildId}/roles`, {
    headers: botHeaders(),
    cache: "no-store"
  });
  if (!res.ok) return [];
  const roles: DiscordRole[] = await res.json();
  return roles.sort((a, b) => b.position - a.position);
}
