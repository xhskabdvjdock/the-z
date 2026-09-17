import { ensureDb } from "@/lib/db";
import { GuildConfig } from "@thez/shared";
import { getGuildChannels, getGuildRoles } from "@/lib/discord";
import { requireGuildAdmin } from "@/lib/guildAccess";
import AutoResponseForm from "./AutoResponseForm";

export default async function AutoResponsePage({ params }: { params: { guildId: string } }) {
  await requireGuildAdmin(params.guildId);
  await ensureDb();

  const [config, channels, roles] = await Promise.all([
    GuildConfig.findOne({ guildId: params.guildId }).lean(),
    getGuildChannels(params.guildId).catch(() => []),
    getGuildRoles(params.guildId).catch(() => [])
  ]);

  // Migrate old response field to new responses array for backward compatibility
  const initial = (config?.autoResponses ?? []).map((ar: any) => {
    if (ar.response && !ar.responses) {
      return { ...ar, responses: [ar.response], response: undefined };
    }
    return ar;
  });

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold">الردود التلقائية</h1>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
        أضف كلمات أو عبارات يرد عليها البوت تلقائياً في الرومات التي تحددها.
      </p>
      <AutoResponseForm
        guildId={params.guildId}
        initial={initial}
        channels={channels}
        roles={roles}
      />
    </div>
  );
}
