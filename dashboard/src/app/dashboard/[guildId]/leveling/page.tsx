import { ensureDb } from "@/lib/db";
import { GuildConfig, LevelUser, ILevelUser } from "@thez/shared";
import { getGuildChannels, getGuildRoles } from "@/lib/discord";
import LevelingForm from "./LevelingForm";
import { LevelingInput } from "./actions";

export default async function LevelingPage({ params }: { params: { guildId: string } }) {
  await ensureDb();

  const [config, channels, roles, topUsers] = await Promise.all([
    GuildConfig.findOne({ guildId: params.guildId }).lean(),
    getGuildChannels(params.guildId),
    getGuildRoles(params.guildId),
    LevelUser.find({ guildId: params.guildId }).sort({ totalXp: -1 }).limit(5).lean() as unknown as Promise<
      ILevelUser[]
    >
  ]);

  const initial: LevelingInput = {
    enabled: config?.leveling?.enabled ?? false,
    xpPerMessage: {
      min: config?.leveling?.xpPerMessage?.min ?? 15,
      max: config?.leveling?.xpPerMessage?.max ?? 25
    },
    xpPerVoiceMinute: config?.leveling?.xpPerVoiceMinute ?? 10,
    messageCooldownSeconds: config?.leveling?.messageCooldownSeconds ?? 60,
    levelUpMessage: config?.leveling?.levelUpMessage ?? {
      enabled: true,
      content: "🎉 مبروك {user}، وصلت إلى المستوى {level}!"
    },
    levelUpChannelId: config?.leveling?.levelUpChannelId ?? "",
    announceInChannel: config?.leveling?.announceInChannel ?? true,
    roleRewards: config?.leveling?.roleRewards ?? [],
    ignoredChannelIds: config?.leveling?.ignoredChannelIds ?? [],
    ignoredRoleIds: config?.leveling?.ignoredRoleIds ?? []
  };

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold">المستويات والخبرة</h1>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
        تحكّم في نظام الخبرة والمستويات ومكافآت الرتب داخل السيرفر.
      </p>

      <div className="card mb-6 flex flex-col gap-3">
        <h2 className="text-lg font-bold">🏆 المتصدرون</h2>
        {topUsers.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">لا يوجد أعضاء بعد.</p>
        ) : (
          <ol className="flex flex-col gap-2">
            {topUsers.map((u, i) => (
              <li
                key={u.userId}
                className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800/50"
              >
                <span className="font-medium">
                  #{i + 1} — {u.userId}
                </span>
                <span className="text-slate-500 dark:text-slate-400">{u.totalXp} XP</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      <LevelingForm guildId={params.guildId} initial={initial} channels={channels} roles={roles} />
    </div>
  );
}
