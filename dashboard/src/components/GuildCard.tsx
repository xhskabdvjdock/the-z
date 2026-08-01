import Image from "next/image";
import Link from "next/link";
import { ManageableGuild } from "@/lib/discord";

export default function GuildCard({ guild }: { guild: ManageableGuild }) {
  const content = (
    <div
      className={`card flex items-center gap-4 transition ${
        guild.botIn ? "cursor-pointer hover:border-brand hover:shadow-md" : "opacity-60"
      }`}
    >
      {guild.iconUrl ? (
        <Image src={guild.iconUrl} alt={guild.name} width={48} height={48} className="rounded-full" />
      ) : (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand/10 text-lg font-bold text-brand">
          {guild.name.slice(0, 1)}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{guild.name}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {guild.botIn ? "إدارة السيرفر" : "البوت غير موجود في هذا السيرفر"}
        </p>
      </div>
    </div>
  );

  if (!guild.botIn) return content;
  return <Link href={`/dashboard/${guild.id}`}>{content}</Link>;
}
