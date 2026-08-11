import { ensureDb } from "@/lib/db";
import { GuildConfig } from "@thez/shared";
import { getGuildRoles, getGuildChannels } from "@/lib/discord";
import RolesForm from "./RolesForm";
import { RolesConfigInput } from "./actions";

export default async function RolesPage({ params }: { params: { guildId: string } }) {
  await ensureDb();

  const [config, roles, channels] = await Promise.all([
    GuildConfig.findOne({ guildId: params.guildId }).lean(),
    getGuildRoles(params.guildId),
    getGuildChannels(params.guildId)
  ]);

  const initial: RolesConfigInput = {
    autoRole: {
      enabled: config?.autoRole?.enabled ?? false,
      userRoleIds: config?.autoRole?.userRoleIds ?? [],
      botRoleIds: config?.autoRole?.botRoleIds ?? []
    },
    colors: {
      enabled: config?.colors?.enabled ?? false,
      panelChannelId: config?.colors?.panelChannelId ?? "",
      panelMessageId: config?.colors?.panelMessageId ?? "",
      roles: config?.colors?.roles ?? []
    },
    selfRoles: config?.selfRoles ?? []
  };

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold">الرولات والألوان</h1>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
        إدارة الرتب التلقائية، الألوان، ولوحات الرتب (Role Panels).
      </p>
      <RolesForm guildId={params.guildId} initial={initial} roles={roles} channels={channels} />
    </div>
  );
}
