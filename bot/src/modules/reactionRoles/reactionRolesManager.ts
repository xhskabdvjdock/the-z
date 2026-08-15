import {
  MessageReaction,
  PartialMessageReaction,
  PartialUser,
  User
} from "discord.js";
import { ExtendedClient } from "../../client";
import { getGuildConfig } from "../../utils/guildConfig";
import { logError } from "../../utils/logger";

/**
 * يطابق إيموجي الرياكشن مع الرتبة المسجلة — يدعم الإيموجي اليونيكود باسمه،
 * والإيموجي المخصص بمعرّفه، وصيغة <:name:id> المخزنة.
 */
function matchEmoji(reaction: MessageReaction | PartialMessageReaction, stored: string): boolean {
  if (!stored) return false;
  const name = reaction.emoji.name;
  const id = reaction.emoji.id;
  if (stored === name) return true;
  if (stored === id) return true;
  if (id && stored.includes(id)) return true;
  return false;
}

async function handle(
  client: ExtendedClient,
  reaction: MessageReaction | PartialMessageReaction,
  user: User | PartialUser,
  mode: "add" | "remove"
): Promise<void> {
  try {
    if (user.bot) return;

    if (reaction.partial) {
      await reaction.fetch().catch(() => null);
    }
    if (reaction.message.partial) {
      await reaction.message.fetch().catch(() => null);
    }

    const guildId = reaction.message.guildId;
    if (!guildId) return;

    const gConfig = await getGuildConfig(client, guildId);
    const cfg = gConfig.reactionRoles;
    if (!cfg?.enabled || !cfg.messageId) return;
    if (reaction.message.id !== cfg.messageId) return;

    const role = cfg.roles.find((r) => matchEmoji(reaction, r.emoji));
    if (!role) return;

    const guild = client.guilds.cache.get(guildId);
    if (!guild) return;

    const member =
      guild.members.cache.get(user.id) ?? (await guild.members.fetch(user.id).catch(() => null));
    if (!member) return;

    if (mode === "add") {
      if (!member.roles.cache.has(role.roleId)) await member.roles.add(role.roleId).catch(() => null);
    } else {
      if (member.roles.cache.has(role.roleId)) await member.roles.remove(role.roleId).catch(() => null);
    }
  } catch (err) {
    logError("reaction-roles", err);
  }
}

/** تسجيل مستمعي الرياكشن لمنح/إزالة رتب الرولات عبر الرياكشن */
export function registerReactionRoles(client: ExtendedClient): void {
  client.on("messageReactionAdd", (reaction, user) => handle(client, reaction, user, "add"));
  client.on("messageReactionRemove", (reaction, user) => handle(client, reaction, user, "remove"));
}