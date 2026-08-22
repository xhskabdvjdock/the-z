import { ensureDb } from "@/lib/db";
import { GuildConfig, IGuildConfig } from "@thez/shared";
import { getGuildChannels } from "@/lib/discord";
import MemberCounterForm from "./MemberCounterForm";

export default async function MemberCounterPage({ params }: { params: { guildId: string } }) {
  await ensureDb();

  const [config, channels] = await Promise.all([
    GuildConfig.findOne({ guildId: params.guildId }).lean(),
    getGuildChannels(params.guildId)
  ]);

  const initial: IGuildConfig["memberCounter"] = {
    enabled: config?.memberCounter?.enabled ?? false,
    channelId: config?.memberCounter?.channelId ?? "",
    format: config?.memberCounter?.format ?? "الأعضاء: {count}"
  };

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold">عداد الأعضاء</h1>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
        روم صوتي يُعاد تسميته تلقائيًا حسب عدد أعضاء السيرفر والمتصلين.
      </p>
      <MemberCounterForm guildId={params.guildId} initial={initial} channels={channels} />
    </div>
  );
}