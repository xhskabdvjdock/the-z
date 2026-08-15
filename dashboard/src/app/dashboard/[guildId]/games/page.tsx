import { ensureDb } from "@/lib/db";
import {
  GAMES,
  getDefaultGameOverride,
  GuildConfig,
  IGameOverride
} from "@thez/shared";
import { getGuildChannels } from "@/lib/discord";
import GamesForm from "./GamesForm";

export default async function GamesPage({ params }: { params: { guildId: string } }) {
  await ensureDb();

  const [config, channels] = await Promise.all([
    GuildConfig.findOne({ guildId: params.guildId }).lean(),
    getGuildChannels(params.guildId)
  ]);

  const saved = config?.games;
  const savedOverrides: IGameOverride[] = saved?.overrides ?? [];

  // كل لعبة: الإعداد المحفوظ أو الافتراضي إن لم يُعدَّل بعد
  const overrides = GAMES.map((meta) => {
    const existing = savedOverrides.find((o) => o.name === meta.name);
    return existing ?? getDefaultGameOverride(meta.name);
  });

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold">ألعاب The Z</h1>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
        فعّل وعطّل كل لعبة، حدد برودتها والرومات المسموح اللعب فيها.
      </p>
      <GamesForm
        guildId={params.guildId}
        initialEnabled={saved?.enabled ?? true}
        overrides={overrides}
        channels={channels}
      />
    </div>
  );
}