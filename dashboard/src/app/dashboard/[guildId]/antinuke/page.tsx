import { ensureDb } from "@/lib/db";
import { GuildConfig, IGuildConfig } from "@thez/shared";
import { getGuildChannels } from "@/lib/discord";
import AntiNukeForm from "./AntiNukeForm";

export default async function AntiNukePage({ params }: { params: { guildId: string } }) {
  await ensureDb();

  const [config, channels] = await Promise.all([
    GuildConfig.findOne({ guildId: params.guildId }).lean(),
    getGuildChannels(params.guildId)
  ]);

  const initial: IGuildConfig["antiNuke"] = {
    enabled: config?.antiNuke?.enabled ?? false,
    maxBans: config?.antiNuke?.maxBans ?? 3,
    maxKicks: config?.antiNuke?.maxKicks ?? 3,
    maxChannelDeletes: config?.antiNuke?.maxChannelDeletes ?? 3,
    maxChannelCreates: config?.antiNuke?.maxChannelCreates ?? 3,
    maxRoleDeletes: config?.antiNuke?.maxRoleDeletes ?? 3,
    maxRoleCreates: config?.antiNuke?.maxRoleCreates ?? 3,
    timeWindowSeconds: config?.antiNuke?.timeWindowSeconds ?? 10,
    punishment: config?.antiNuke?.punishment ?? "stripRoles",
    logChannelId: config?.antiNuke?.logChannelId ?? "",
    whitelistUserIds: config?.antiNuke?.whitelistUserIds ?? []
  };

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold">مكافحة الغزو (Anti-Nuke)</h1>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
        احمِ سيرفرك من محاولات التخريب الجماعي (حظر/طرد/حذف رومات ورتب بشكل مكثف) عبر تحديد حدود
        قصوى لكل إجراء خلال فترة زمنية معينة، مع إمكانية معاقبة المخالف تلقائياً.
      </p>
      <AntiNukeForm guildId={params.guildId} initial={initial} channels={channels} />
    </div>
  );
}
