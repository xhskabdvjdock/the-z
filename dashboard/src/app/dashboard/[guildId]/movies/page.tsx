import { ensureDb } from "@/lib/db";
import { GuildConfig } from "@thez/shared";
import { getGuildChannels } from "@/lib/discord";
import MoviesForm from "./MoviesForm";

export default async function MoviesPage({ params }: { params: { guildId: string } }) {
  await ensureDb();
  const [config, channels] = await Promise.all([
    GuildConfig.findOne({ guildId: params.guildId }).lean(),
    getGuildChannels(params.guildId)
  ]);

  const movies = (config as any)?.movies ?? { enabled: false, channelId: "" };

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold">الأفلام والمسلسلات</h1>
      <p className="mb-6 text-sm text-slate-500">حدد قناة البحث — يعتمد على TMDB و OMDb لعرض البوستر والتقييم والملخص.</p>
      <MoviesForm guildId={params.guildId} initial={{ enabled: Boolean(movies.enabled), channelId: movies.channelId ?? "" }} channels={channels} />
    </div>
  );
}