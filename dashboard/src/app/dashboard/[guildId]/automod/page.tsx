import { ensureDb } from "@/lib/db";
import { GuildConfig } from "@thez/shared";
import { getGuildChannels, getGuildRoles } from "@/lib/discord";
import AutomodForm from "./AutomodForm";
import { AutomodInput } from "./actions";

export default async function AutomodPage({ params }: { params: { guildId: string } }) {
  await ensureDb();

  const [config, channels, roles] = await Promise.all([
    GuildConfig.findOne({ guildId: params.guildId }).lean(),
    getGuildChannels(params.guildId),
    getGuildRoles(params.guildId)
  ]);

  const initial: AutomodInput = {
    enabled: config?.automod?.enabled ?? false,
    antiInvite: config?.automod?.antiInvite ?? false,
    antiLink: config?.automod?.antiLink ?? false,
    antiSpam: {
      enabled: config?.automod?.antiSpam?.enabled ?? false,
      maxMessages: config?.automod?.antiSpam?.maxMessages ?? 5,
      perSeconds: config?.automod?.antiSpam?.perSeconds ?? 5
    },
    antiMention: {
      enabled: config?.automod?.antiMention?.enabled ?? false,
      maxMentions: config?.automod?.antiMention?.maxMentions ?? 5
    },
    antiCaps: {
      enabled: config?.automod?.antiCaps?.enabled ?? false,
      percentThreshold: config?.automod?.antiCaps?.percentThreshold ?? 70,
      minLength: config?.automod?.antiCaps?.minLength ?? 10
    },
    antiRepeat: {
      enabled: config?.automod?.antiRepeat?.enabled ?? false,
      maxRepeats: config?.automod?.antiRepeat?.maxRepeats ?? 4
    },
    badWords: config?.automod?.badWords ?? [],
    whitelistRoleIds: config?.automod?.whitelistRoleIds ?? [],
    whitelistChannelIds: config?.automod?.whitelistChannelIds ?? [],
    punishment: config?.automod?.punishment ?? "delete",
    muteRoleId: config?.automod?.muteRoleId ?? "",
    autoDeleteConfirmation: config?.moderation?.autoDeleteConfirmation ?? 0
  };

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold">الرقابة التلقائية (Auto-Mod)</h1>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
        احمِ سيرفرك تلقائياً من السبام والروابط والكلمات المسيئة.
      </p>
      <AutomodForm guildId={params.guildId} initial={initial} channels={channels} roles={roles} />
    </div>
  );
}
