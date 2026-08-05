import Link from "next/link";
import Image from "next/image";
import { requireGuildAdmin } from "@/lib/guildAccess";
import { getGuildInfo, guildIconUrl } from "@/lib/discord";
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
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center gap-4">
        <Link href="/dashboard" className="btn-secondary !px-3 !py-1.5 text-sm">
          ← السيرفرات
        </Link>
        {guild && (
          <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-[#121318] border border-[#2A2D37]">
            {guild.icon ? (
              <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg">
                <Image
                  src={guildIconUrl(guild.id, guild.icon)!}
                  alt={guild.name}
                  fill
                  className="object-cover"
                  sizes="32px"
                />
              </div>
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#5865F2] text-xs font-bold text-white">
                {guild.name.charAt(0)}
              </div>
            )}
            <h1 className="text-base font-semibold text-[#F0F0F0]">{guild.name}</h1>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="lg:w-64 flex-shrink-0">
          <Sidebar guildId={params.guildId} />
        </div>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
