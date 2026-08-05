import { botHeaders } from "./discord";

export interface DiscordMember {
  user: {
    id: string;
    username: string;
    discriminator: string;
    avatar: string | null;
    global_name: string | null;
  };
  nick: string | null;
  avatar: string | null;
  roles: string[];
  joined_at: string | null;
  premium_since: string | null;
  deaf: boolean;
  mute: boolean;
  flags: number;
  pending: boolean;
  communication_disabled_until: string | null;
}

export async function getGuildMembers(guildId: string, limit: number = 100, after?: string) {
  const url = new URL(`https://discord.com/api/v10/guilds/${guildId}/members`);
  url.searchParams.append("limit", limit.toString());
  if (after) {
    url.searchParams.append("after", after);
  }

  const res = await fetch(url.toString(), {
    headers: botHeaders(),
    cache: "no-store"
  });

  if (!res.ok) return [];
  return res.json() as Promise<DiscordMember[]>;
}

export async function kickMember(guildId: string, userId: string, reason?: string) {
  const url = new URL(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}`);
  const body = reason ? { reason } : undefined;

  const res = await fetch(url.toString(), {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      ...botHeaders()
    },
    body: body ? JSON.stringify(body) : undefined
  });

  return res.ok;
}

export async function banMember(guildId: string, userId: string, reason?: string, deleteMessageDays?: number) {
  const url = new URL(`https://discord.com/api/v10/guilds/${guildId}/bans/${userId}`);
  const body: any = {};
  if (reason) body.reason = reason;
  if (deleteMessageDays) body.delete_message_days = deleteMessageDays;

  const res = await fetch(url.toString(), {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...botHeaders()
    },
    body: JSON.stringify(body)
  });

  return res.ok;
}

export async function timeoutMember(guildId: string, userId: string, duration: number, reason?: string) {
  const url = new URL(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}`);
  const body: any = {
    communication_disabled_until: new Date(Date.now() + duration * 1000).toISOString()
  };
  if (reason) body.reason = reason;

  const res = await fetch(url.toString(), {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...botHeaders()
    },
    body: JSON.stringify(body)
  });

  return res.ok;
}
