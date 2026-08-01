import { ensureDb } from "@/lib/db";
import { GuildConfig } from "@thez/shared";
import { getGuildInfo } from "@/lib/discord";
import Link from "next/link";

export default async function GuildOverviewPage({ params }: { params: { guildId: string } }) {
  await ensureDb();
  const [config, guild] = await Promise.all([
    GuildConfig.findOne({ guildId: params.guildId }).lean(),
    getGuildInfo(params.guildId)
  ]);

  const features: { label: string; enabled: boolean; href: string; icon: string }[] = [
    { label: "نظام التذاكر", enabled: !!config?.tickets?.enabled, href: "tickets", icon: "🎫" },
    { label: "الرومات الصوتية", enabled: !!config?.tempVoice?.enabled, href: "voice", icon: "🎙️" },
    { label: "رسائل الترحيب", enabled: !!config?.welcome?.enabled, href: "welcome", icon: "👋" },
    { label: "نظام المستويات", enabled: !!config?.leveling?.enabled, href: "leveling", icon: "🆙" },
    { label: "الرقابة التلقائية", enabled: !!config?.automod?.enabled, href: "automod", icon: "🛡️" },
    { label: "مكافحة الغزو", enabled: !!config?.antiNuke?.enabled, href: "antinuke", icon: "🚨" },
    { label: "نظام التحقق", enabled: !!config?.captcha?.enabled, href: "captcha", icon: "🔐" },
    { label: "السجلات", enabled: !!config?.logging?.enabled, href: "logging", icon: "📋" }
  ];

  const enabledCount = features.filter((f) => f.enabled).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="عدد الأعضاء" value={guild?.approximate_member_count ?? "—"} icon="👥" />
        <StatCard label="عدد الرومات" value={guild?.channels?.length ?? "—"} icon="💬" />
        <StatCard label="الميزات المفعّلة" value={`${enabledCount} / ${features.length}`} icon="✅" />
        <StatCard label="البادئة الحالية" value={config?.prefix ?? "!"} icon="⌨️" />
      </div>

      <div>
        <h2 className="mb-3 text-lg font-bold">الميزات</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <Link
              key={f.href}
              href={`/dashboard/${params.guildId}/${f.href}`}
              className="card flex items-center justify-between transition hover:border-brand"
            >
              <span className="flex items-center gap-2 font-medium">
                <span>{f.icon}</span>
                {f.label}
              </span>
              <span
                className={`h-2.5 w-2.5 rounded-full ${f.enabled ? "bg-green-500" : "bg-slate-400"}`}
                title={f.enabled ? "مفعّل" : "معطّل"}
              />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: string }) {
  return (
    <div className="card">
      <p className="mb-1 text-2xl">{icon}</p>
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}
