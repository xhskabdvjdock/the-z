import { ensureDb } from "@/lib/db";
import { GuildConfig, IGuildConfig } from "@thez/shared";
import { getGuildChannels, getGuildRoles } from "@/lib/discord";
import ReactionRolesForm from "./ReactionRolesForm";

export default async function ReactionRolesPage({ params }: { params: { guildId: string } }) {
  await ensureDb();

  const [config, channels, roles] = await Promise.all([
    GuildConfig.findOne({ guildId: params.guildId }).lean(),
    getGuildChannels(params.guildId),
    getGuildRoles(params.guildId)
  ]);

  const initial: IGuildConfig["reactionRoles"] = {
    enabled: config?.reactionRoles?.enabled ?? false,
    channelId: config?.reactionRoles?.channelId ?? "",
    messageId: config?.reactionRoles?.messageId ?? "",
    title: config?.reactionRoles?.title ?? "أضف رياكشن لاختيار رتبتك",
    description: config?.reactionRoles?.description ?? "",
    roles: config?.reactionRoles?.roles ?? []
  };

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold">رولات الرياكشن</h1>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
        منح وإزالة الرتب تلقائيًا عندما يضيف الأعضاء رياكشن على رسالة محددة.
      </p>
      <ReactionRolesForm guildId={params.guildId} initial={initial} channels={channels} roles={roles} />
    </div>
  );
}