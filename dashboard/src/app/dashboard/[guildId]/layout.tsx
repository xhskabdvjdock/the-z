import Link from "next/link";
import { requireGuildAdmin } from "@/lib/guildAccess";
import { getGuildInfo } from "@/lib/discord";
import Sidebar from "@/components/Sidebar";

export default async function GuildLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: { guildId: string };
}) {
  await requireGuildAdmin(params.guildId);
  const guild = await getGuildInfo(params.guildId);

  return (
    <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6">
      <div className="mb-5 flex items-center gap-3">
        <Link href="/dashboard" className="btn-secondary !px-2.5 !py-1.5 text-xs">
          ← السيرفرات
        </Link>
        {guild && (
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-sm font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-200">
              {guild.name.charAt(0)}
            </div>
            <h1 className="font-bold text-slate-900 dark:text-slate-100">{guild.name}</h1>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-5 sm:flex-row">
        <Sidebar guildId={params.guildId} />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
