"use client";

import { useState } from "react";
import { DiscordChannel } from "@/lib/discord";
import Toggle from "@/components/form/Toggle";
import ChannelSelect from "@/components/form/ChannelSelect";
import CustomMessageEditor from "@/components/form/CustomMessageEditor";
import VariablesHint from "@/components/form/VariablesHint";
import SaveButton from "@/components/form/SaveButton";
import { saveWelcomeConfig, WelcomeLeaveInput } from "./actions";

export default function WelcomeForm({
  guildId,
  initial,
  channels
}: {
  guildId: string;
  initial: WelcomeLeaveInput;
  channels: DiscordChannel[];
}) {
  const [state, setState] = useState<WelcomeLeaveInput>(initial);

  return (
    <div className="flex flex-col gap-6">
      <VariablesHint />

      <section className="card flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">👋 رسالة الترحيب</h2>
          <Toggle
            checked={state.welcome.enabled}
            onChange={(v) => setState({ ...state, welcome: { ...state.welcome, enabled: v } })}
            label={state.welcome.enabled ? "مفعّل" : "معطّل"}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <ChannelSelect
            label="روم الترحيب"
            channels={channels}
            types={[0, 5]}
            value={state.welcome.channelId ?? ""}
            onChange={(v) => setState({ ...state, welcome: { ...state.welcome, channelId: v } })}
          />
          <div className="flex items-end gap-6">
            <Toggle
              checked={state.welcome.sendInDm}
              onChange={(v) => setState({ ...state, welcome: { ...state.welcome, sendInDm: v } })}
              label="الإرسال في الخاص (DM)"
            />
            <Toggle
              checked={state.welcome.imageEnabled}
              onChange={(v) => setState({ ...state, welcome: { ...state.welcome, imageEnabled: v } })}
              label="توليد صورة ترحيب"
            />
          </div>
        </div>

        {state.welcome.imageEnabled && (
          <div>
            <label className="label">رابط صورة خلفية مخصصة (اختياري)</label>
            <input
              className="input"
              placeholder="https://..."
              value={state.welcome.imageBackground ?? ""}
              onChange={(e) =>
                setState({ ...state, welcome: { ...state.welcome, imageBackground: e.target.value } })
              }
            />
          </div>
        )}

        <CustomMessageEditor
          value={state.welcome.message}
          onChange={(msg) => setState({ ...state, welcome: { ...state.welcome, message: msg } })}
        />
      </section>

      <section className="card flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">📤 رسالة المغادرة</h2>
          <Toggle
            checked={state.leave.enabled}
            onChange={(v) => setState({ ...state, leave: { ...state.leave, enabled: v } })}
            label={state.leave.enabled ? "مفعّل" : "معطّل"}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <ChannelSelect
            label="روم المغادرة"
            channels={channels}
            types={[0, 5]}
            value={state.leave.channelId ?? ""}
            onChange={(v) => setState({ ...state, leave: { ...state.leave, channelId: v } })}
          />
          <div className="flex items-end">
            <Toggle
              checked={state.leave.imageEnabled}
              onChange={(v) => setState({ ...state, leave: { ...state.leave, imageEnabled: v } })}
              label="توليد صورة مغادرة"
            />
          </div>
        </div>

        <CustomMessageEditor
          value={state.leave.message}
          onChange={(msg) => setState({ ...state, leave: { ...state.leave, message: msg } })}
        />
      </section>

      <SaveButton onSave={() => saveWelcomeConfig(guildId, state)} />
    </div>
  );
}
