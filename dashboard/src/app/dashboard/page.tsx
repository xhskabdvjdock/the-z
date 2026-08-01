import { requireSession } from "@/lib/guildAccess";
import { getManageableGuilds } from "@/lib/discord";
import GuildCard from "@/components/GuildCard";

export default async function GuildSelectorPage() {
  const session = await requireSession();
  const guilds = await getManageableGuilds(session.accessToken!);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="mb-1 text-2xl font-bold">اختر سيرفرك</h1>
      <p className="mb-8 text-slate-500 dark:text-slate-400">
        هذه قائمة السيرفرات التي تملك فيها صلاحية المدير (Administrator).
      </p>

      {guilds.length === 0 ? (
        <div className="card text-center text-slate-500 dark:text-slate-400">
          لا توجد سيرفرات تملك فيها صلاحية الإدارة الكاملة.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {guilds.map((g) => (
            <GuildCard key={g.id} guild={g} />
          ))}
        </div>
      )}
    </div>
  );
}
