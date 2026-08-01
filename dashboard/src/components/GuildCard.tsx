import Link from "next/link";
import { ManageableGuild } from "@/lib/discord";

export default function GuildCard({ guild }: { guild: ManageableGuild }) {
  const content = (
    <div
      className={`card flex items-center gap-4 transition-all duration-150 ${
        guild.botIn ? "cursor-pointer hover:border-[#5865F2]" : "opacity-60"
      }`}
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#5865F2] text-base font-bold text-white">
        {guild.name.charAt(0)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-[#F0F0F0]">{guild.name}</p>
        <p className="text-xs text-[#9CA3AF]">
          {guild.botIn ? "إدارة السيرفر" : "البوت غير موجود"}
        </p>
      </div>
    </div>
  );

  if (!guild.botIn) return content;
  return <Link href={`/dashboard/${guild.id}`}>{content}</Link>;
}
