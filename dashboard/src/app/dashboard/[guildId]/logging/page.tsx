import { ensureDb } from "@/lib/db";
import { GuildConfig, IGuildConfig } from "@thez/shared";
import { getGuildChannels } from "@/lib/discord";
import LoggingForm from "./LoggingForm";

export default async function LoggingPage({ params }: { params: { guildId: string } }) {
  await ensureDb();

  const [config, channels] = await Promise.all([
    GuildConfig.findOne({ guildId: params.guildId }).lean(),
    getGuildChannels(params.guildId)
  ]);

  const initial: IGuildConfig["logging"] = {
    enabled: config?.logging?.enabled ?? false,
    categoryId: config?.logging?.categoryId ?? "",
    channels: {
      messageDelete: config?.logging?.channels?.messageDelete ?? "",
      messageEdit: config?.logging?.channels?.messageEdit ?? "",
      memberJoin: config?.logging?.channels?.memberJoin ?? "",
      memberLeave: config?.logging?.channels?.memberLeave ?? "",
      memberUpdate: config?.logging?.channels?.memberUpdate ?? "",
      voiceUpdate: config?.logging?.channels?.voiceUpdate ?? "",
      channelUpdate: config?.logging?.channels?.channelUpdate ?? "",
      roleUpdate: config?.logging?.channels?.roleUpdate ?? "",
      moderation: config?.logging?.channels?.moderation ?? "",
      server: config?.logging?.channels?.server ?? ""
    }
  };

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold">السجلات (Logging)</h1>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
        حدد الروم المخصص لكل نوع من أنواع الأحداث لتوثيق كل ما يحدث في سيرفرك أولاً بأول.
      </p>
      <LoggingForm guildId={params.guildId} initial={initial} channels={channels} />
    </div>
  );
}
