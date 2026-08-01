import { ensureDb } from "@/lib/db";
import { GuildConfig, IGuildConfig } from "@thez/shared";
import { getGuildChannels } from "@/lib/discord";
import VoiceForm from "./VoiceForm";

export default async function VoicePage({ params }: { params: { guildId: string } }) {
  await ensureDb();

  const [config, channels] = await Promise.all([
    GuildConfig.findOne({ guildId: params.guildId }).lean(),
    getGuildChannels(params.guildId)
  ]);

  const initial: IGuildConfig["tempVoice"] = {
    enabled: config?.tempVoice?.enabled ?? false,
    joinToCreateChannelId: config?.tempVoice?.joinToCreateChannelId ?? "",
    categoryId: config?.tempVoice?.categoryId ?? "",
    defaultUserLimit: config?.tempVoice?.defaultUserLimit ?? 0,
    nameTemplate: config?.tempVoice?.nameTemplate ?? "روم {user}",
    controlPanelChannelId: config?.tempVoice?.controlPanelChannelId ?? "",
    controlPanelMessageId: config?.tempVoice?.controlPanelMessageId ?? ""
  };

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold">الرومات الصوتية المؤقتة</h1>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
        اسمح للأعضاء بإنشاء رومات صوتية خاصة بهم تلقائياً عند الانضمام لروم معيّن.
      </p>
      <VoiceForm guildId={params.guildId} initial={initial} channels={channels} />
    </div>
  );
}
