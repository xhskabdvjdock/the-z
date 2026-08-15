"use client";

import { useState } from "react";
import {
  GAMES,
  getGameCooldown,
  IGameMeta,
  IGameOverride
} from "@thez/shared/client";
import { DiscordChannel } from "@/lib/discord";
import Toggle from "@/components/form/Toggle";
import MultiSelect from "@/components/form/MultiSelect";
import SaveButton from "@/components/form/SaveButton";
import { saveGamesSettings } from "./actions";

const CATEGORY_LABELS: Record<IGameMeta["category"], string> = {
  multiplayer: "جماعية",
  singleplayer: "فردية"
};

const TEXT_CHANNEL_TYPES = [0, 5];

export default function GamesForm({
  guildId,
  initialEnabled,
  overrides,
  channels
}: {
  guildId: string;
  initialEnabled: boolean;
  overrides: IGameOverride[];
  channels: DiscordChannel[];
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [state, setState] = useState<IGameOverride[]>(overrides);

  const channelOptions = channels
    .filter((c) => TEXT_CHANNEL_TYPES.includes(c.type))
    .map((c) => ({ id: c.id, label: `#${c.name}` }));

  const update = (name: string, patch: Partial<IGameOverride>) => {
    setState((prev) => prev.map((g) => (g.name === name ? { ...g, ...patch } : g)));
  };

  const groups = (["multiplayer", "singleplayer"] as const).map((cat) => ({
    category: cat,
    items: GAMES.filter((g) => g.category === cat)
  }));

  const handleSave = async () => {
    await saveGamesSettings(guildId, { enabled, overrides: state });
  };

  return (
    <div className="flex flex-col gap-6 pb-4">
      <section className="card flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold">تفعيل الألعاب</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            عند التعطيل لا يمكن لأي عضو فتح أو الانضمام لأي لعبة في هذا السيرفر.
          </p>
        </div>
        <Toggle
          checked={enabled}
          onChange={setEnabled}
          label={enabled ? "مفعّلة" : "معطّلة"}
        />
      </section>

      {groups.map((group) => (
        <section key={group.category} className="card flex flex-col gap-3">
          <h2 className="text-lg font-bold">
            الألعاب {CATEGORY_LABELS[group.category]}
            <span className="mr-2 text-sm font-normal text-slate-500">
              ({group.items.length})
            </span>
          </h2>
          <div className="flex flex-col gap-2">
            {group.items.map((meta) => {
              const game = state.find((g) => g.name === meta.name)!;
              const defaultCooldown = getGameCooldown(meta.name);
              return (
                <details
                  key={meta.name}
                  className="rounded-lg border border-slate-200 dark:border-slate-800"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="font-semibold">
                        {meta.title}
                        {!game.enabled && (
                          <span className="mr-2 text-xs font-normal text-red-500">(معطّل)</span>
                        )}
                      </span>
                      <span className="truncate text-xs text-slate-500 dark:text-slate-400">
                        {meta.description}
                      </span>
                      <span className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        الأمر:{" "}
                        <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">
                          {meta.prefix}
                        </code>
                        {" · "}
                        {meta.minPlayers === meta.maxPlayers
                          ? `${meta.maxPlayers} لاعب`
                          : `${meta.minPlayers}-${meta.maxPlayers} لاعبين`}
                        {" · "}
                        {meta.durationLabel}
                      </span>
                    </div>
                    <span onClick={(e) => e.stopPropagation()}>
                      <Toggle
                        checked={game.enabled}
                        onChange={(v) => update(meta.name, { enabled: v })}
                      />
                    </span>
                  </summary>

                  <div className="flex flex-col gap-4 border-t border-slate-200 p-4 dark:border-slate-800">
                    <div>
                      <label className="label">برودة اللعب (بالثواني)</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          className="input w-28"
                          value={game.cooldownSeconds ?? ""}
                          placeholder={String(defaultCooldown)}
                          onChange={(e) =>
                            update(meta.name, {
                              cooldownSeconds:
                                e.target.value === "" ? undefined : Math.max(0, Number(e.target.value))
                            })
                          }
                        />
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          فارغ = الافتراضي من اللعبة ({defaultCooldown} ثانية)
                        </p>
                      </div>
                    </div>

                    <MultiSelect
                      label="الرومات المسموح اللعب فيها"
                      options={channelOptions}
                      values={game.allowedChannelIds}
                      onChange={(v) => update(meta.name, { allowedChannelIds: v })}
                      emptyText="كل الرومات (بدون تقييد)"
                    />
                  </div>
                </details>
              );
            })}
          </div>
        </section>
      ))}

      <div className="sticky bottom-4 z-10">
        <div className="card !py-3 shadow-lg">
          <SaveButton onSave={handleSave} />
        </div>
      </div>
    </div>
  );
}