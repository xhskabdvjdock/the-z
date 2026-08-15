import { GuildConfig, IGuildConfig } from "@thez/shared";
import { ExtendedClient } from "../client";

const CACHE_TTL_MS = 30_000;

/**
 * يملأ الحقول المنطقية المفقودة في commandOverrides بالقيم الآمنة (true).
 * بيانات قديمة أُضيفت قبل وجود الحقول (enabled/slashEnabled/prefixEnabled) كانت
 * تُفسَّر كتعطيل في البوت — هذا يصلحها تلقائياً ويحفظ الإصلاح في القاعدة.
 */
function normalizeOverrides(overrides: any[] | undefined): { normalized: any[]; changed: boolean } {
  if (!Array.isArray(overrides)) return { normalized: overrides ?? [], changed: false };
  let changed = false;
  const normalized = overrides.map((o) => {
    if (o == null || typeof o !== "object") return o;
    const patch: Record<string, boolean> = {};
    if (o.enabled === undefined || o.enabled === null) patch.enabled = true;
    if (o.slashEnabled === undefined || o.slashEnabled === null) patch.slashEnabled = true;
    if (o.prefixEnabled === undefined || o.prefixEnabled === null) patch.prefixEnabled = true;
    if (Object.keys(patch).length) {
      changed = true;
      return { ...o, ...patch };
    }
    return o;
  });
  return { normalized, changed };
}

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

  const { normalized, changed } = normalizeOverrides(doc.commandOverrides);
  if (changed) {
    doc.commandOverrides = normalized;
    GuildConfig.updateOne({ guildId }, { $set: { commandOverrides: normalized } }).catch(() => null);
  }

  client.guildConfigCache.set(guildId, { data: doc, expiresAt: Date.now() + CACHE_TTL_MS });
  return doc;
}

export function invalidateGuildConfigCache(client: ExtendedClient, guildId: string) {
  client.guildConfigCache.delete(guildId);
}
