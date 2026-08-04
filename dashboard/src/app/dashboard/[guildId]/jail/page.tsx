import { ensureDb } from "@/lib/db";
import { GuildConfig } from "@thez/shared";
import { getGuildRoles } from "@/lib/discord";
import JailForm from "./JailForm";

export default async function JailPage({ params }: { params: { guildId: string } }) {
  await ensureDb();

  const [config, roles] = await Promise.all([
    GuildConfig.findOne({ guildId: params.guildId }).lean(),
    getGuildRoles(params.guildId)
  ]);

  const initial = {
    enabled: config?.jail?.enabled ?? false,
    roleId: config?.jail?.roleId ?? "",
    removeRoles: config?.jail?.removeRoles ?? [],
    allowAdminBypass: config?.jail?.allowAdminBypass ?? true
  };

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold">نظام السجن (Jail)</h1>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
        قم بإعداد نظام السجن لعزل الأعضاء المشاغبين عن طريق سحب رتبهم وإعطائهم رتبة مخصصة.
      </p>
      <JailForm guildId={params.guildId} initial={initial} roles={roles} />
    </div>
  );
}
