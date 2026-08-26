"use client";

import { useState } from "react";
import Toggle from "@/components/form/Toggle";
import SaveButton from "@/components/form/SaveButton";
import { saveGamesConfig } from "./actions";
import { GAMES_LIST } from "@thez/shared/client";

export default function GamesManager({
  guildId,
  initialEnabled,
  initialGames,
  gamesList
}: {
  guildId: string;
  initialEnabled: boolean;
  initialGames: Record<string, { enabled: boolean; command: string }>;
  gamesList: typeof GAMES_LIST;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [games, setGames] = useState(initialGames);

  const grouped = {
    جماعية: gamesList.filter((g) => g.category === "جماعية"),
    فردية: gamesList.filter((g) => g.category === "فردية")
  };

  const updateGame = (id: string, patch: Partial<{ enabled: boolean; command: string }>) => {
    setGames({ ...games, [id]: { ...games[id], ...patch } });
  };

  return (
    <div className="flex flex-col gap-8">
      <section className="card flex flex-col gap-6 p-8">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">تفعيل نظام الألعاب</h2>
          <Toggle checked={enabled} onChange={setEnabled} label={enabled ? "مفعّل" : "معطّل"} />
        </div>
        <p className="text-sm text-slate-500">عند التعطيل تتوقف كل الألعاب في السيرفر</p>
      </section>

      {(["جماعية", "فردية"] as const).map((cat) => (
        <section key={cat} className="card flex flex-col gap-6 p-8">
          <h2 className="text-xl font-bold">ألعاب {cat} ({grouped[cat].length})</h2>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {grouped[cat].map((g) => (
              <div key={g.id} className="flex items-center gap-4 rounded-xl border border-[#2A2D37] p-4">
                <div className="flex-1">
                  <p className="font-bold">{g.name}</p>
                  <p className="text-xs text-slate-500">{g.description}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs">الأمر:</span>
                    <span className="text-xs font-mono">,</span>
                    <input
                      className="input !py-1 !px-2 text-sm w-32"
                      value={games[g.id]?.command ?? g.id}
                      onChange={(e) => updateGame(g.id, { command: e.target.value })}
                    />
                  </div>
                </div>
                <Toggle checked={games[g.id]?.enabled ?? true} onChange={(v) => updateGame(g.id, { enabled: v })} label="" />
              </div>
            ))}
          </div>
        </section>
      ))}

      <SaveButton onSave={() => saveGamesConfig(guildId, { enabled, games })} />
    </div>
  );
}