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
          <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-slate-900/80 border border-slate-700/50 backdrop-blur-xl">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-bold text-white shadow-lg shadow-indigo-500/30">
              {guild.name.charAt(0)}
            </div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">{guild.name}</h1>
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
