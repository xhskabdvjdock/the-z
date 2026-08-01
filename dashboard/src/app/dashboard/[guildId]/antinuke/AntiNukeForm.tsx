"use client";

import { useState } from "react";
import { IGuildConfig } from "@thez/shared/client";
import { DiscordChannel } from "@/lib/discord";
import Toggle from "@/components/form/Toggle";
import ChannelSelect from "@/components/form/ChannelSelect";
import SaveButton from "@/components/form/SaveButton";
import { saveAntiNukeConfig } from "./actions";

type AntiNukeConfig = IGuildConfig["antiNuke"];

const PUNISHMENT_OPTIONS: { value: AntiNukeConfig["punishment"]; label: string }[] = [
  { value: "stripRoles", label: "سحب كل الرتب" },
  { value: "kick", label: "طرد" },
  { value: "ban", label: "حظر" }
];

const NUMBER_FIELDS: { key: keyof AntiNukeConfig; label: string }[] = [
  { key: "maxBans", label: "الحد الأقصى لعمليات الحظر خلال الفترة الزمنية" },
  { key: "maxKicks", label: "الحد الأقصى لعمليات الطرد خلال الفترة الزمنية" },
  { key: "maxChannelDeletes", label: "الحد الأقصى لحذف الرومات خلال الفترة الزمنية" },
  { key: "maxChannelCreates", label: "الحد الأقصى لإنشاء الرومات خلال الفترة الزمنية" },
  { key: "maxRoleDeletes", label: "الحد الأقصى لحذف الرتب خلال الفترة الزمنية" },
  { key: "maxRoleCreates", label: "الحد الأقصى لإنشاء الرتب خلال الفترة الزمنية" },
  { key: "timeWindowSeconds", label: "الفترة الزمنية بالثواني" }
];

export default function AntiNukeForm({
  guildId,
  initial,
  channels
}: {
  guildId: string;
  initial: AntiNukeConfig;
  channels: DiscordChannel[];
}) {
  const [state, setState] = useState<AntiNukeConfig>(initial);

  return (
    <div className="flex flex-col gap-6">
      <section className="card flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">🚨 مكافحة الغزو</h2>
          <Toggle
            checked={state.enabled}
            onChange={(v) => setState({ ...state, enabled: v })}
            label={state.enabled ? "مفعّل" : "معطّل"}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {NUMBER_FIELDS.map((field) => (
            <div key={field.key}>
              <label className="label">{field.label}</label>
              <input
                type="number"
                min={0}
                className="input"
                value={state[field.key] as number}
                onChange={(e) =>
                  setState({ ...state, [field.key]: Number(e.target.value) } as AntiNukeConfig)
                }
              />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label">العقوبة عند تجاوز الحدود</label>
            <select
              className="input"
              value={state.punishment}
              onChange={(e) =>
                setState({ ...state, punishment: e.target.value as AntiNukeConfig["punishment"] })
              }
            >
              {PUNISHMENT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <ChannelSelect
            label="روم سجل مكافحة الغزو"
            channels={channels}
            types={[0, 5]}
            value={state.logChannelId ?? ""}
            onChange={(v) => setState({ ...state, logChannelId: v })}
          />
        </div>

        <div>
          <label className="label">قائمة الاستثناء (Whitelist)</label>
          <textarea
            className="input min-h-[120px]"
            placeholder={"123456789012345678\n987654321098765432"}
            value={(state.whitelistUserIds ?? []).join("\n")}
            onChange={(e) =>
              setState({
                ...state,
                whitelistUserIds: e.target.value
                  .split("\n")
                  .map((id) => id.trim())
                  .filter((id) => id.length > 0)
              })
            }
          />
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            أدخل آيدي المستخدمين المستثنين من هذا النظام (الإداريين الموثوقين)، كل آيدي في سطر
            منفصل.
          </p>
        </div>
      </section>

      <SaveButton onSave={() => saveAntiNukeConfig(guildId, state)} />
    </div>
  );
}
