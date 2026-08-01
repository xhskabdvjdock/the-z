import Link from "next/link";
import { ManageableGuild } from "@/lib/discord";

export default function GuildCard({ guild }: { guild: ManageableGuild }) {
  const content = (
    <div
      className={`card flex items-center gap-4 transition-all duration-200 ${
        guild.botIn ? "cursor-pointer hover:border-gray-600" : "opacity-60"
      }`}
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gray-800 text-lg font-bold text-white border border-gray-700">
        {guild.name.charAt(0)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-white">{guild.name}</p>
        <p className="text-xs text-gray-400">
          {guild.botIn ? "إدارة السيرفر" : "البوت غير موجود"}
        </p>
      </div>
    </div>
  );

  if (!guild.botIn) return content;
  return <Link href={`/dashboard/${guild.id}`}>{content}</Link>;
}
