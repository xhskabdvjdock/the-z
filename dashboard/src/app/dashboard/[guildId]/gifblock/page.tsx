import { ensureDb } from "@/lib/db";
import { GuildConfig, GifBlock } from "@thez/shared";
import { getGuildChannels, getGuildRoles } from "@/lib/discord";
import GifBlockForm from "./GifBlockForm";

export default async function GifBlockPage({ params }: { params: { guildId: string } }) {
  await ensureDb();

  const [config, channels, roles, gifBlocks] = await Promise.all([
    GuildConfig.findOne({ guildId: params.guildId }).lean(),
    getGuildChannels(params.guildId),
    getGuildRoles(params.guildId),
    GifBlock.find({ guildId: params.guildId }).lean()
  ]);

  const initial = {
    enabled: config?.gifBlock?.enabled ?? false,
    logChannelId: config?.gifBlock?.logChannelId ?? "",
    whitelistRoleIds: config?.gifBlock?.whitelistRoleIds ?? [],
    whitelistChannelIds: config?.gifBlock?.whitelistChannelIds ?? [],
    gifBlocks: gifBlocks.map((block: any) => ({
      id: block._id?.toString() || "",
      url: block.url,
      action: block.action as "delete" | "warn" | "mute" | "kick" | "ban",
      duration: block.duration || 0,
      reason: block.reason || "",
      enabled: block.enabled
    }))
  };

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold">حظر GIFs</h1>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
        احمِ سيرفرك من GIFs غير المرغوبة عن طريق حظر روابط محددة مع إجراءات تلقائية.
      </p>
      <GifBlockForm guildId={params.guildId} initial={initial} channels={channels} roles={roles} />
    </div>
  );
}