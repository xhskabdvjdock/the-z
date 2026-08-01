import Image from "next/image";
import Link from "next/link";
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
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/dashboard" className="btn-secondary !px-2.5 !py-1.5 text-xs">
          ← كل السيرفرات
        </Link>
        {guild && (
          <div className="flex items-center gap-2">
            {guild.icon ? (
              <Image
                src={guildIconUrl(guild.id, guild.icon) ?? ""}
                alt={guild.name}
                width={28}
                height={28}
                className="rounded-full"
              />
            ) : null}
            <h1 className="font-bold">{guild.name}</h1>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-6 sm:flex-row">
        <Sidebar guildId={params.guildId} />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
