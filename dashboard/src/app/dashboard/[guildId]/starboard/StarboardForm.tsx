"use client";

import { useState } from "react";
import { ResolvedStarboardSettings } from "@thez/shared/client";
import { DiscordChannel, DiscordRole } from "@/lib/discord";
import Toggle from "@/components/form/Toggle";
import ChannelSelect from "@/components/form/ChannelSelect";
import MultiSelect from "@/components/form/MultiSelect";
import SaveButton from "@/components/form/SaveButton";
import { saveStarboardConfig } from "./actions";

export default function StarboardForm({
  guildId,
  initial,
  channels,
  roles
}: {
  guildId: string;
  initial: ResolvedStarboardSettings;
  channels: DiscordChannel[];
  roles: DiscordRole[];
}) {
  const [state, setState] = useState<ResolvedStarboardSettings>(initial);

  return (
    <div className="flex flex-col gap-6">
      <section className="card flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">إعدادات لوحة النجوم</h2>
          <Toggle
            checked={state.enabled}
            onChange={(v) => setState({ ...state, enabled: v })}
            label={state.enabled ? "مفعّل" : "معطّل"}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <ChannelSelect
            label="روم اللوحة"
            channels={channels}
            types={[0, 5]}
            value={state.channelId ?? ""}
            onChange={(v) => setState({ ...state, channelId: v || null })}
          />
          <div>
            <label className="label">الحد الأدنى للتفاعلات</label>
            <input
              type="number"
              min={1}
              max={100}
              className="input"
              value={state.threshold}
              onChange={(e) => setState({ ...state, threshold: Number(e.target.value) || 1 })}
            />
          </div>
          <div>
            <label className="label">الإيموجي المحتسب</label>
            <input
              className="input"
              maxLength={16}
              value={state.emoji}
              onChange={(e) => setState({ ...state, emoji: e.target.value })}
              placeholder="⭐"
            />
          </div>
          <div>
            <label className="label">أقل عمر حساب بالأيام (0 = بدون شرط)</label>
            <input
              type="number"
              min={0}
              max={3650}
              className="input"
              value={state.minAccountAgeDays}
              onChange={(e) => setState({ ...state, minAccountAgeDays: Number(e.target.value) || 0 })}
            />
          </div>
        </div>

        <Toggle
          checked={state.removeOnBelowThreshold}
          onChange={(v) => setState({ ...state, removeOnBelowThreshold: v })}
          label="حذف رسالة اللوحة عند النزول تحت الحد"
        />

        <MultiSelect
          label="الرومات المستثناة"
          options={channels.map((c) => ({ id: c.id, label: `# ${c.name}` }))}
          values={state.ignoredChannelIds}
          onChange={(v) => setState({ ...state, ignoredChannelIds: v })}
        />

        <MultiSelect
          label="الرتب المستثناة (رسائل أصحابها تُتجاهل)"
          options={roles.map((r) => ({ id: r.id, label: r.name }))}
          values={state.ignoredRoleIds}
          onChange={(v) => setState({ ...state, ignoredRoleIds: v })}
        />
      </section>

      <SaveButton onSave={() => saveStarboardConfig(guildId, state)} />
    </div>
  );
}
