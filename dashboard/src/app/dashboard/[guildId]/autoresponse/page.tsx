import { ensureDb } from "@/lib/db";
import { GuildConfig } from "@thez/shared";
import { getGuildChannels } from "@/lib/discord";
import AutoResponseForm from "./AutoResponseForm";

export default async function AutoResponsePage({ params }: { params: { guildId: string } }) {
  await ensureDb();

  const [config, channels] = await Promise.all([
    GuildConfig.findOne({ guildId: params.guildId }).lean(),
    getGuildChannels(params.guildId)
  ]);

  const initial = config?.autoResponses ?? [];

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold">الردود التلقائية</h1>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
        أضف كلمات أو عبارات يرد عليها البوت تلقائياً في الرومات التي تحددها.
      </p>
      <AutoResponseForm guildId={params.guildId} initial={initial} channels={channels} />
    </div>
  );
}
