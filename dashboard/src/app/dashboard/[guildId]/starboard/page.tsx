import { ensureDb } from "@/lib/db";
import { GuildConfig, resolveStarboardSettings } from "@thez/shared";
import { getGuildChannels, getGuildRoles } from "@/lib/discord";
import StarboardForm from "./StarboardForm";

export default async function StarboardPage({ params }: { params: { guildId: string } }) {
  await ensureDb();

  const [config, channels, roles] = await Promise.all([
    GuildConfig.findOne({ guildId: params.guildId }).lean(),
    getGuildChannels(params.guildId),
    getGuildRoles(params.guildId)
  ]);

  const initial = resolveStarboardSettings(config);

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold">لوحة النجوم</h1>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
        نشر الرسائل المميزة تلقائيًا عند وصول التفاعلات للحد المطلوب.
      </p>
      <StarboardForm guildId={params.guildId} initial={initial} channels={channels} roles={roles} />
    </div>
  );
}
