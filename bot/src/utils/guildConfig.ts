import { GuildConfig, IGuildConfig } from "@thez/shared";
import { ExtendedClient } from "../client";

const CACHE_TTL_MS = 30_000;

export async function getGuildConfig(
  client: ExtendedClient,
  guildId: string
): Promise<IGuildConfig> {
  const cached = client.guildConfigCache.get(guildId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  let doc = await GuildConfig.findOne({ guildId });
  if (!doc) {
    doc = await GuildConfig.create({ guildId });
  }

  client.guildConfigCache.set(guildId, { data: doc, expiresAt: Date.now() + CACHE_TTL_MS });
  return doc;
}

export function invalidateGuildConfigCache(client: ExtendedClient, guildId: string) {
  client.guildConfigCache.delete(guildId);
}
