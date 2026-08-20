const API_BASE = "https://discord.com/api/v10";
const ADMINISTRATOR = 0x8n;

// ذاكرة مؤقتة لسيرفرات المستخدم — مدة الصلاحية 2 دقيقة
const guildsCache = new Map<string, { data: DiscordGuildSummary[]; expiresAt: number }>();
const GUILDS_CACHE_TTL = 2 * 60 * 1000; // 2 دقائق

// ذاكرة مؤقتة لأعضاء السيرفر (للتأكد من انتماء المستخدم للداشبورد) — 60 ثانية
const memberCache = new Map<string, { data: { roles: string[] } | null; expiresAt: number }>();
const MEMBER_CACHE_TTL = 60 * 1000;

export function botHeaders() {
  const token = process.env.DISCORD_BOT_TOKEN || process.env.DISCORD_TOKEN;
  if (!token) {
    console.error("DISCORD_BOT_TOKEN / DISCORD_TOKEN environment variable is not set!");
  }
  return { Authorization: `Bot ${token}` };
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

/** يجلب سيرفرات المستخدم مع ذاكرة مؤقتة لتجنب تجاوز حد Discord API */
export async function getUserGuilds(
  accessToken: string,
  force = false
): Promise<DiscordGuildSummary[]> {
  const now = Date.now();
  const cached = guildsCache.get(accessToken);

  if (!force && cached && now < cached.expiresAt) {
    return cached.data;
  }

  const res = await fetch(`${API_BASE}/users/@me/guilds`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store"
  });

  if (!res.ok) {
    // إذا فشل الطلب (rate limit / انتهاء التوكن) نُرجع الكاش القديم إن وُجد
    if (cached) return cached.data;
    return [];
  }

  const data: DiscordGuildSummary[] = await res.json();
  guildsCache.set(accessToken, { data, expiresAt: now + GUILDS_CACHE_TTL });
  return data;
}

/**
 * يجلب عضوًا في سيرفر عن طريق توكن البوت (رتبه) — يُستخدم للتحقق من صلاحيات
 * رتب الداشبورد المخصصة. يُعيد null إن لم يكن العضو في السيرفر أو لا يستطيع البوت استدعاءه.
 */
export async function getGuildMember(
  guildId: string,
  userId: string
): Promise<{ roles: string[] } | null> {
  const cacheKey = `${guildId}:${userId}`;
  const now = Date.now();
  const cached = memberCache.get(cacheKey);
  if (cached && now < cached.expiresAt) return cached.data;

  const res = await fetch(`${API_BASE}/guilds/${guildId}/members/${userId}`, {
    headers: botHeaders(),
    cache: "no-store"
  });

  let data: { roles: string[] } | null = null;
  if (res.ok) {
    const body = (await res.json()) as { roles?: string[] };
    data = { roles: body.roles ?? [] };
  }
  memberCache.set(cacheKey, { data, expiresAt: now + MEMBER_CACHE_TTL });
  return data;
}

/** يجلب قائمة آيديات السيرفرات التي يوجد بها البوت حالياً */
export async function getBotGuildIds(): Promise<Set<string>> {
  const res = await fetch(`${API_BASE}/users/@me/guilds?limit=200`, {
    headers: botHeaders(),
    next: { revalidate: 60 } // كاش لمدة دقيقة
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
    next: { revalidate: 30 }
  });
  if (!res.ok) return null;
  return res.json();
}

export async function getGuildChannels(guildId: string): Promise<DiscordChannel[]> {
  const res = await fetch(`${API_BASE}/guilds/${guildId}/channels`, {
    headers: botHeaders(),
    next: { revalidate: 30 }
  });
  if (!res.ok) return [];
  const channels: DiscordChannel[] = await res.json();
  return channels.sort((a, b) => a.position - b.position);
}

export async function getGuildRoles(guildId: string): Promise<DiscordRole[]> {
  const res = await fetch(`${API_BASE}/guilds/${guildId}/roles`, {
    headers: botHeaders(),
    next: { revalidate: 30 }
  });
  if (!res.ok) return [];
  const roles: DiscordRole[] = await res.json();
  return roles.sort((a, b) => b.position - a.position);
}

/** إنشاء رتبة جديدة في السيرفر (يتطلب صلاحية Manage Roles في البوت) */
export async function createGuildRole(guildId: string, body: Record<string, unknown>) {
  const res = await fetch(`${API_BASE}/guilds/${guildId}/roles`, {
    method: "POST",
    headers: { ...botHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store"
  });
  const text = await res.text().catch(() => "");
  let role: DiscordRole | null = null;
  try {
    role = JSON.parse(text);
  } catch {
    // جسم الرد غير JSON — يُعاد خطأ أدناه
  }
  if (!res.ok) {
    return { ok: false, status: res.status, role: null, error: text.slice(0, 300) };
  }
  return { ok: true, status: res.status, role, error: "" };
}

/** حذف رتبة من السيرفر (يتطلب صلاحية Manage Roles في البوت) */
export async function deleteGuildRole(guildId: string, roleId: string) {
  const res = await fetch(`${API_BASE}/guilds/${guildId}/roles/${roleId}`, {
    method: "DELETE",
    headers: botHeaders(),
    cache: "no-store"
  });
  return { ok: res.ok, status: res.status };
}

/**
 * أعلى رتبة يملكها البوت في السيرفر (position). أي رتبة أعلى منها لا يمكن
 * للبوت منحها/إزالتها — نستخدمها في التحقق من صلاحية اللوحات.
 */
export async function getBotTopRolePosition(guildId: string): Promise<number> {
  try {
    const me = await fetch(`${API_BASE}/users/@me`, {
      headers: botHeaders(),
      cache: "no-store"
    });
    if (!me.ok) return Number.MAX_SAFE_INTEGER;
    const botId = ((await me.json()) as { id: string }).id;

    const member = await fetch(`${API_BASE}/guilds/${guildId}/members/${botId}`, {
      headers: botHeaders(),
      cache: "no-store"
    });
    if (!member.ok) return Number.MAX_SAFE_INTEGER;
    const { roles: botRoleIds } = (await member.json()) as { roles: string[] };

    const allRoles = await getGuildRoles(guildId);
    const positions = allRoles.filter((r) => botRoleIds.includes(r.id)).map((r) => r.position);
    return positions.length ? Math.max(...positions) : 0;
  } catch {
    return Number.MAX_SAFE_INTEGER;
  }
}

/** تحقق من إمكانية إدارة القائمة كاملة: @everyone + رتب مُدارة + رتب أعلى من البوت */
export function validateRolePanel(
  guildId: string,
  roleIds: { roleId: string; label: string }[],
  roles: DiscordRole[],
  botTopPosition: number
): string[] {
  const issues: string[] = [];
  const roleMap = new Map(roles.map((r) => [r.id, r]));

  for (const opt of roleIds) {
    const role = roleMap.get(opt.roleId);
    if (!role || opt.roleId === guildId) {
      issues.push(`الرتبة "${opt.label}" غير متاحة (غير موجودة أو @everyone)`);
      continue;
    }
    if (role.managed) {
      issues.push(`الرتبة "${role.name}" مُدارة (managed) ولا يمكن للبوت منحها`);
      continue;
    }
    if (role.position >= botTopPosition) {
      issues.push(`الرتبة "${role.name}" أعلى من أعلى رتبة يملكها البوت`);
    }
  }
  return issues;
}

export async function sendChannelMessage(
  channelId: string,
  payload: unknown
): Promise<{ ok: boolean; status: number; id?: string; error?: string }> {
  const res = await fetch(`${API_BASE}/channels/${channelId}/messages`, {
    method: "POST",
    headers: { ...botHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store"
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    return { ok: false, status: res.status, error: detail.slice(0, 500) };
  }
  const data = (await res.json()) as { id: string };
  return { ok: true, status: res.status, id: data.id };
}

export async function editChannelMessage(
  channelId: string,
  messageId: string,
  payload: unknown
): Promise<{ ok: boolean; status: number; id?: string; error?: string }> {
  const res = await fetch(`${API_BASE}/channels/${channelId}/messages/${messageId}`, {
    method: "PATCH",
    headers: { ...botHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store"
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    return { ok: false, status: res.status, error: detail.slice(0, 500) };
  }
  const data = (await res.json()) as { id: string };
  return { ok: true, status: res.status, id: data.id };
}
