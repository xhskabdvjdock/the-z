import { ensureDb } from "@/lib/db";
import { DEFAULT_COMMANDS, GuildConfig, ICommandOverride, IGuildConfig } from "@thez/shared";
import { getGuildChannels, getGuildRoles } from "@/lib/discord";
import CommandsForm, { CommandRow } from "./CommandsForm";

function buildDefaultOverride(name: string): ICommandOverride {
  return {
    name,
    enabled: true,
    alias: "",
    slashEnabled: true,
    prefixEnabled: true,
    allowedRoleIds: [],
    deniedRoleIds: [],
    allowedUserIds: [],
    deniedUserIds: [],
    allowedChannelIds: [],
    deniedChannelIds: [],
    customResponse: { enabled: false }
  };
}

export default async function CommandsPage({ params }: { params: { guildId: string } }) {
  await ensureDb();

  const [config, channels, roles] = await Promise.all([
    GuildConfig.findOne({ guildId: params.guildId }).lean(),
    getGuildChannels(params.guildId),
    getGuildRoles(params.guildId)
  ]);

  const overrides: ICommandOverride[] = config?.commandOverrides ?? [];

  const commands: CommandRow[] = DEFAULT_COMMANDS.map((meta) => {
    const existing = overrides.find((o) => o.name === meta.name);
    const override = existing ?? buildDefaultOverride(meta.name);
    return {
      ...override,
      category: meta.category,
      descriptionAr: meta.descriptionAr,
      type: meta.type
    };
  });

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold">إدارة الأوامر</h1>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
        تحكم بتفعيل وتقييد وتخصيص كل أوامر البوت من مكان واحد.
      </p>
      <CommandsForm 
        guildId={params.guildId} 
        commands={commands} 
        channels={channels} 
        roles={roles}
        initialConfig={config || { moderation: { autoDeleteConfirmation: 3 } } as any}
      />
    </div>
  );
}
