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
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center gap-4">
        <Link href="/dashboard" className="btn-secondary !px-4 !py-2 text-sm">
          ← السيرفرات
        </Link>
        {guild && (
          <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 shadow-sm">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-sm font-bold text-white shadow-md">
              {guild.name.charAt(0)}
            </div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">{guild.name}</h1>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-8 lg:flex-row">
        <div className="lg:w-64 flex-shrink-0">
          <Sidebar guildId={params.guildId} />
        </div>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
