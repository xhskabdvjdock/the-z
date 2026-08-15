import { ensureDb } from "@/lib/db";
import { GuildConfig, IGuildConfig } from "@thez/shared";
import { getGuildChannels } from "@/lib/discord";
import SchedulesForm from "./SchedulesForm";

export default async function SchedulesPage({ params }: { params: { guildId: string } }) {
  await ensureDb();

  const [config, channels] = await Promise.all([
    GuildConfig.findOne({ guildId: params.guildId }).lean(),
    getGuildChannels(params.guildId)
  ]);

  const initial: IGuildConfig["scheduledMessages"] = config?.scheduledMessages ?? [];

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold">الرسائل المجدولة</h1>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
        رسائل تُرسل تلقائيًا في وقت محدد، ويمكن تكرارها دوريًا كل عدد دقائق.
      </p>
      <SchedulesForm guildId={params.guildId} initial={initial} channels={channels} />
    </div>
  );
}