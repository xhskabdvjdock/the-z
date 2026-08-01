import Link from "next/link";
import { ManageableGuild } from "@/lib/discord";

export default function GuildCard({ guild }: { guild: ManageableGuild }) {
  const content = (
    <div
      className={`card flex items-center gap-4 transition-all duration-300 ${
        guild.botIn ? "cursor-pointer hover:border-blue-400 hover:shadow-xl hover:shadow-blue-500/10" : "opacity-60"
      }`}
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-lg font-bold text-white shadow-md">
        {guild.name.charAt(0)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-slate-900 dark:text-slate-100">{guild.name}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {guild.botIn ? "إدارة السيرفر" : "البوت غير موجود"}
        </p>
      </div>
    </div>
  );

  if (!guild.botIn) return content;
  return <Link href={`/dashboard/${guild.id}`}>{content}</Link>;
}
