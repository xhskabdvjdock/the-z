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
      moderation: config?.logging?.channels?.moderation ?? "",
      members: config?.logging?.channels?.members ?? "",
      messages: config?.logging?.channels?.messages ?? "",
      voice: config?.logging?.channels?.voice ?? "",
      actions: config?.logging?.channels?.actions ?? "",
      files: config?.logging?.channels?.files ?? "",
      server: config?.logging?.channels?.server ?? "",
      roles: config?.logging?.channels?.roles ?? "",
      channels: config?.logging?.channels?.channels ?? "",
      other: config?.logging?.channels?.other ?? "",
      invites: config?.logging?.channels?.invites ?? "",
      suggestions: config?.logging?.channels?.suggestions ?? "",
      access: config?.logging?.channels?.access ?? "",
      leveling: config?.logging?.channels?.leveling ?? "",
      jail: config?.logging?.channels?.jail ?? "",
      reactionroles: config?.logging?.channels?.reactionroles ?? ""
    },
    customChannels: {
      messages: Array.isArray(config?.logging?.customChannels?.messages) ? config.logging.customChannels.messages : [],
      commands: Array.isArray(config?.logging?.customChannels?.commands) ? config.logging.customChannels.commands : (config?.logging?.customChannels?.commands as any ? [config.logging.customChannels.commands as string] : []),
      media: Array.isArray(config?.logging?.customChannels?.media) ? config.logging.customChannels.media : (config?.logging?.customChannels?.media as any ? [config.logging.customChannels.media as string] : []),
      stickers: Array.isArray(config?.logging?.customChannels?.stickers) ? config.logging.customChannels.stickers : (config?.logging?.customChannels?.stickers as any ? [config.logging.customChannels.stickers as string] : [])
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
