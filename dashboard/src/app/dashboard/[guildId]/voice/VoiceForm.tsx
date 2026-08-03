"use client";

import { useState } from "react";
import { IGuildConfig } from "@thez/shared/client";
import { DiscordChannel } from "@/lib/discord";
import Toggle from "@/components/form/Toggle";
import ChannelSelect from "@/components/form/ChannelSelect";
import SaveButton from "@/components/form/SaveButton";
import { saveVoiceConfig } from "./actions";

export default function VoiceForm({
  guildId,
  initial,
  channels
}: {
  guildId: string;
  initial: IGuildConfig["tempVoice"];
  channels: DiscordChannel[];
}) {
  const [state, setState] = useState<IGuildConfig["tempVoice"]>(initial);

  return (
    <div className="flex flex-col gap-6">
      <section className="card flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">🎙️ الرومات الصوتية المؤقتة</h2>
          <Toggle
            checked={state.enabled}
            onChange={(v) => setState({ ...state, enabled: v })}
            label={state.enabled ? "مفعّل" : "معطّل"}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <ChannelSelect
            label="روم الانضمام لإنشاء روم جديد"
            channels={channels}
            types={[2]}
            value={state.joinToCreateChannelId ?? ""}
            onChange={(v) => setState({ ...state, joinToCreateChannelId: v })}
          />

          <ChannelSelect
            label="التصنيف (Category) الذي تُنشأ بداخله الرومات"
            channels={channels}
            types={[4]}
            value={state.categoryId ?? ""}
            onChange={(v) => setState({ ...state, categoryId: v })}
          />

          <ChannelSelect
            label="روم لوحة التحكم (الذي تُرسل فيه اللوحة)"
            channels={channels}
            types={[0]}
            value={state.controlPanelChannelId ?? ""}
            onChange={(v) => setState({ ...state, controlPanelChannelId: v })}
          />

          <div>
            <label className="label">الحد الافتراضي لعدد الأعضاء (0 = بلا حد)</label>
            <input
              type="number"
              min={0}
              max={99}
              className="input"
              value={state.defaultUserLimit}
              onChange={(e) => setState({ ...state, defaultUserLimit: Number(e.target.value) })}
            />
          </div>

          <div>
            <label className="label">قالب اسم الروم</label>
            <input
              className="input"
              placeholder="روم {user}"
              value={state.nameTemplate}
              onChange={(e) => setState({ ...state, nameTemplate: e.target.value })}
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              استخدم {"{user}"} لاسم العضو
            </p>
          </div>
        </div>
      </section>

      <SaveButton onSave={() => saveVoiceConfig(guildId, state)} />
    </div>
  );
}
