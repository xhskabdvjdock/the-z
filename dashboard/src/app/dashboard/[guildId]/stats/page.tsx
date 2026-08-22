import { ensureDb } from "@/lib/db";
import { GuildConfig, LevelUser, ModerationLog, ActionLog } from "@thez/shared";
import { getGuildInfo, getGuildChannels, getGuildRoles } from "@/lib/discord";

const FEATURE_LABELS: { key: string; label: string }[] = [
  { key: "tickets.enabled", label: "نظام التذاكر" },
  { key: "tempVoice.enabled", label: "الرومات الصوتية المؤقتة" },
  { key: "alwaysVoice.enabled", label: "البوت المقيم صوتيًا" },
  { key: "colors.enabled", label: "رولات الألوان" },
  { key: "welcome.enabled", label: "الترحيب" },
  { key: "leave.enabled", label: "رسالة المغادرة" },
  { key: "leveling.enabled", label: "المستويات والخبرة" },
  { key: "logging.enabled", label: "السجلات" },
  { key: "automod.enabled", label: "الرقابة التلقائية" },
  { key: "jail.enabled", label: "نظام السجن" },
  { key: "antiNuke.enabled", label: "مكافحة الغزو" },
  { key: "captcha.enabled", label: "نظام التحقق" },
  { key: "memberCounter.enabled", label: "عداد الأعضاء" },
  { key: "reactionRoles.enabled", label: "رولات الرياكشن" }
];

function getFeature(config: any, path: string): boolean {
  return path.split(".").reduce((acc: any, key) => (acc == null ? undefined : acc[key]), config) === true;
}

function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

export default async function StatsPage({ params }: { params: { guildId: string } }) {
  await ensureDb();

  const [config, guild, channels, roles, topUsers, modCount, recentActions] = await Promise.all([
    GuildConfig.findOne({ guildId: params.guildId }).lean(),
    getGuildInfo(params.guildId),
    getGuildChannels(params.guildId),
    getGuildRoles(params.guildId),
    LevelUser.find({ guildId: params.guildId }).sort({ totalXp: -1 }).limit(10),
    ModerationLog.countDocuments({ guildId: params.guildId }),
    ActionLog.find({ guildId: params.guildId }).sort({ createdAt: -1 }).limit(10)
  ]);

  const memberCount = guild?.approximate_member_count ?? guild?.member_count ?? 0;
  const presenceCount = guild?.approximate_presence_count ?? 0;
  const boosts = guild?.premium_subscription_count ?? 0;
  const maxXp = topUsers.length ? Math.max(...topUsers.map((u) => u.totalXp)) : 1;

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold">لوحة الإحصائيات</h1>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
        نظرة شاملة على السيرفر والأنظمة المفعلة ونشاط الأعضاء.
      </p>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "الأعضاء", value: formatNumber(memberCount) },
          { label: "المتصلون الآن", value: formatNumber(presenceCount) },
          { label: "الرومات", value: formatNumber(channels.length) },
          { label: "الرتب", value: formatNumber(roles.length) },
          { label: "الرفع (Boosts)", value: formatNumber(boosts) },
          { label: "سجلات الإشراف", value: formatNumber(modCount) }
        ].map((s) => (
          <div key={s.label} className="card flex flex-col gap-1">
            <span className="text-xs text-slate-500 dark:text-slate-400">{s.label}</span>
            <span className="text-2xl font-bold text-[#F0F0F0]">{s.value}</span>
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="card flex flex-col gap-3">
          <h2 className="text-base font-bold">الأنظمة المفعلة</h2>
          {config ? (
            <div className="flex flex-wrap gap-2">
              {FEATURE_LABELS.filter((f) => getFeature(config, f.key)).map((f) => (
                <span key={f.key} className="rounded-full bg-[#5865F2]/15 px-3 py-1 text-xs font-medium text-[#8B96FF]">
                  {f.label}
                </span>
              ))}
              {FEATURE_LABELS.every((f) => !getFeature(config, f.key)) && (
                <p className="text-sm text-slate-500">لا توجد أنظمة مفعلة بعد.</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-500">لا توجد إعدادات محفوظة بعد.</p>
          )}
        </section>

        <section className="card flex flex-col gap-3">
          <h2 className="text-base font-bold">أفضل 10 أعضاء بالمستوى</h2>
          {topUsers.length === 0 ? (
            <p className="text-sm text-slate-500">لا يوجد نشاط مستويات بعد.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {topUsers.map((u, i) => (
                <div key={u.userId} className="flex items-center gap-3">
                  <span className="w-6 shrink-0 text-xs font-bold text-slate-500">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm text-[#F0F0F0]">{u.userId.slice(0, 8)}</span>
                      <span className="shrink-0 text-xs text-slate-400">
                        المستوى {u.level} - {formatNumber(u.totalXp)} XP
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[#1A1C23]">
                      <div
                        className="h-full rounded-full bg-[#5865F2]"
                        style={{ width: `${Math.round((u.totalXp / maxXp) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="card mt-6 flex flex-col gap-3">
        <h2 className="text-base font-bold">آخر إجراءات من لوحة التحكم</h2>
        {recentActions.length === 0 ? (
          <p className="text-sm text-slate-500">لا توجد إجراءات مسجلة بعد.</p>
        ) : (
          <div className="flex flex-col divide-y divide-[#2A2D37]">
            {recentActions.map((a) => (
              <div key={a._id as string} className="flex items-center justify-between gap-3 py-2 text-sm">
                <div className="min-w-0">
                  <span className="font-medium text-[#F0F0F0]">{a.action}</span>
                  {a.userName && <span className="mr-2 text-xs text-slate-400">بواسطة {a.userName}</span>}
                </div>
                <span className="shrink-0 text-xs text-slate-500">
                  {new Date(a.createdAt).toLocaleString("ar-EG")}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}