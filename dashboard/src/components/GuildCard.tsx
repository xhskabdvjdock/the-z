import Link from "next/link";
import { ManageableGuild } from "@/lib/discord";

export default function GuildCard({ guild }: { guild: ManageableGuild }) {
  const content = (
    <div
      className={`card flex items-center gap-3 transition-all duration-200 ${
        guild.botIn ? "cursor-pointer hover:border-brand hover:shadow-sm" : "opacity-60"
      }`}
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-200 text-base font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-200">
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
