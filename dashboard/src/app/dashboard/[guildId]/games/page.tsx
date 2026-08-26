import { ensureDb } from "@/lib/db";
import { GuildConfig } from "@thez/shared";
import { GAMES_LIST } from "@thez/shared/client";
import GamesManager from "./GamesManager";

export default async function GamesPage({ params }: { params: { guildId: string } }) {
  await ensureDb();
  const config = await GuildConfig.findOne({ guildId: params.guildId }).lean();
  const gamesConfig = (config as any)?.games ?? { enabled: true, games: {} };

  // دمج الافتراضي مع المحفوظ
  const initialGames: Record<string, { enabled: boolean; command: string }> = {};
  for (const g of GAMES_LIST) {
    const saved = gamesConfig.games?.[g.id];
    initialGames[g.id] = {
      enabled: saved?.enabled ?? true,
      command: saved?.command ?? g.id
    };
  }

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold">الألعاب</h1>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
        تفعيل الألعاب وتخصيص أوامرها — بدون إيموجي إلا للضرورة
      </p>
      <GamesManager guildId={params.guildId} initialEnabled={gamesConfig.enabled ?? true} initialGames={initialGames} gamesList={GAMES_LIST as any} />
    </div>
  );
}