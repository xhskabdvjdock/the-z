import { ensureDb } from "@/lib/db";
import { GuildConfig } from "@thez/shared";
import { getGuildInfo } from "@/lib/discord";
import Link from "next/link";
import { 
  Users, 
  Hash, 
  CheckCircle, 
  Terminal 
} from "lucide-react";

export default async function GuildOverviewPage({ params }: { params: { guildId: string } }) {
  await ensureDb();
  const [config, guild] = await Promise.all([
    GuildConfig.findOne({ guildId: params.guildId }).lean(),
    getGuildInfo(params.guildId)
  ]);

  const features: { label: string; enabled: boolean; href: string }[] = [
    { label: "نظام التذاكر", enabled: !!config?.tickets?.enabled, href: "tickets" },
    { label: "الرومات الصوتية", enabled: !!config?.tempVoice?.enabled, href: "voice" },
    { label: "رسائل الترحيب", enabled: !!config?.welcome?.enabled, href: "welcome" },
    { label: "نظام المستويات", enabled: !!config?.leveling?.enabled, href: "leveling" },
    { label: "الرقابة التلقائية", enabled: !!config?.automod?.enabled, href: "automod" },
    { label: "مكافحة الغزو", enabled: !!config?.antiNuke?.enabled, href: "antinuke" },
    { label: "نظام التحقق", enabled: !!config?.captcha?.enabled, href: "captcha" },
    { label: "نظام السجن", enabled: !!config?.jail?.enabled, href: "jail" },
    { label: "السجلات", enabled: !!config?.logging?.enabled, href: "logging" }
  ];

  const enabledCount = features.filter((f) => f.enabled).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard 
          label="عدد الأعضاء" 
          value={guild?.approximate_member_count ?? "—"} 
          icon={Users}
        />
        <StatCard 
          label="عدد الرومات" 
          value={guild?.channels?.length ?? "—"} 
          icon={Hash}
        />
        <StatCard 
          label="الميزات المفعّلة" 
          value={`${enabledCount} / ${features.length}`} 
          icon={CheckCircle}
        />
        <StatCard 
          label="البادئة الحالية" 
          value={config?.prefix ?? "!"} 
          icon={Terminal}
        />
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold text-[#F0F0F0]">الميزات</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <Link
              key={f.href}
              href={`/dashboard/${params.guildId}/${f.href}`}
              className="card flex items-center justify-between transition hover:border-[#5865F2]"
            >
              <span className="font-medium text-[#F0F0F0]">{f.label}</span>
              <span
                className={`h-2.5 w-2.5 rounded-full ${f.enabled ? "bg-[#10B981]" : "bg-[#6B7280]"}`}
                title={f.enabled ? "مفعّل" : "معطّل"}
              />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: string | number; icon: any }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-2">
        <Icon className="h-4 w-4 text-[#9CA3AF]" />
        <span className="text-xl font-bold text-[#F0F0F0]">{value}</span>
      </div>
      <p className="text-xs text-[#9CA3AF]">{label}</p>
    </div>
  );
}
