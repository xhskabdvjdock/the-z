"use client";

import { useState } from "react";
import { DiscordChannel, DiscordRole } from "@/lib/discord";
import Toggle from "@/components/form/Toggle";
import ChannelSelect from "@/components/form/ChannelSelect";
import RoleSelect from "@/components/form/RoleSelect";
import MultiSelect from "@/components/form/MultiSelect";
import CustomMessageEditor from "@/components/form/CustomMessageEditor";
import VariablesHint from "@/components/form/VariablesHint";
import SaveButton from "@/components/form/SaveButton";
import { saveLevelingConfig, LevelingInput } from "./actions";

export default function LevelingForm({
  guildId,
  initial,
  channels,
  roles
}: {
  guildId: string;
  initial: LevelingInput;
  channels: DiscordChannel[];
  roles: DiscordRole[];
}) {
  const [state, setState] = useState<LevelingInput>(initial);

  const channelOptions = channels
    .filter((c) => c.type === 0 || c.type === 5)
    .map((c) => ({ id: c.id, label: `# ${c.name}` }));
  const roleOptions = roles.map((r) => ({ id: r.id, label: `@${r.name}` }));

  return (
    <div className="flex flex-col gap-6">
      <section className="card flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">⭐ نظام الخبرة والمستويات</h2>
          <Toggle
            checked={state.enabled}
            onChange={(v) => setState({ ...state, enabled: v })}
            label={state.enabled ? "مفعّل" : "معطّل"}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="label">أقل خبرة لكل رسالة</label>
            <input
              type="number"
              className="input"
              value={state.xpPerMessage.min}
              onChange={(e) =>
                setState({
                  ...state,
                  xpPerMessage: { ...state.xpPerMessage, min: Number(e.target.value) }
                })
              }
            />
          </div>
          <div>
            <label className="label">أعلى خبرة لكل رسالة</label>
            <input
              type="number"
              className="input"
              value={state.xpPerMessage.max}
              onChange={(e) =>
                setState({
                  ...state,
                  xpPerMessage: { ...state.xpPerMessage, max: Number(e.target.value) }
                })
              }
            />
          </div>
          <div>
            <label className="label">خبرة كل دقيقة صوتية</label>
            <input
              type="number"
              className="input"
              value={state.xpPerVoiceMinute}
              onChange={(e) => setState({ ...state, xpPerVoiceMinute: Number(e.target.value) })}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label">مدة الانتظار بين الرسائل (ثواني)</label>
            <input
              type="number"
              className="input"
              value={state.messageCooldownSeconds}
              onChange={(e) => setState({ ...state, messageCooldownSeconds: Number(e.target.value) })}
            />
          </div>
        </div>
      </section>

      <section className="card flex flex-col gap-4">
        <h2 className="text-lg font-bold">📢 إشعار رفع المستوى</h2>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <ChannelSelect
            label="روم إعلان المستوى"
            channels={channels}
            types={[0, 5]}
            value={state.levelUpChannelId ?? ""}
            onChange={(v) => setState({ ...state, levelUpChannelId: v })}
          />
          <div className="flex items-end">
            <Toggle
              checked={state.announceInChannel}
              onChange={(v) => setState({ ...state, announceInChannel: v })}
              label="الإعلان في الروم"
            />
          </div>
        </div>

        <VariablesHint />
        <p className="text-xs text-slate-500 dark:text-slate-400">
          يمكنك أيضاً استخدام المتغيّر <code className="font-bold text-brand">{"{level}"}</code> للإشارة إلى المستوى الجديد.
        </p>

        <CustomMessageEditor
          value={state.levelUpMessage}
          onChange={(msg) => setState({ ...state, levelUpMessage: msg })}
        />
      </section>

      <section className="card flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">🎁 مكافآت الرتب</h2>
          <button
            type="button"
            className="btn-secondary !px-2.5 !py-1 text-xs"
            onClick={() =>
              setState({
                ...state,
                roleRewards: [...state.roleRewards, { level: 1, roleId: "", removePrevious: false }]
              })
            }
          >
            + إضافة مكافأة
          </button>
        </div>

        {state.roleRewards.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">لا توجد مكافآت رتب بعد.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {state.roleRewards.map((reward, i) => (
              <div
                key={i}
                className="grid grid-cols-1 items-end gap-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50 sm:grid-cols-[100px_1fr_auto_auto]"
              >
                <div>
                  <label className="label">المستوى</label>
                  <input
                    type="number"
                    className="input"
                    value={reward.level}
                    onChange={(e) => {
                      const next = [...state.roleRewards];
                      next[i] = { ...reward, level: Number(e.target.value) };
                      setState({ ...state, roleRewards: next });
                    }}
                  />
                </div>
                <RoleSelect
                  label="الرتبة"
                  roles={roles}
                  value={reward.roleId}
                  onChange={(v) => {
                    const next = [...state.roleRewards];
                    next[i] = { ...reward, roleId: v };
                    setState({ ...state, roleRewards: next });
                  }}
                />
                <Toggle
                  checked={!!reward.removePrevious}
                  onChange={(v) => {
                    const next = [...state.roleRewards];
                    next[i] = { ...reward, removePrevious: v };
                    setState({ ...state, roleRewards: next });
                  }}
                  label="إزالة الرتب السابقة"
                />
                <button
                  type="button"
                  className="btn-danger !px-2.5 !py-1 text-xs"
                  onClick={() => setState({ ...state, roleRewards: state.roleRewards.filter((_, j) => j !== i) })}
                >
                  حذف
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card flex flex-col gap-4">
        <h2 className="text-lg font-bold">🚫 استثناءات</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <MultiSelect
            label="رومات مستثناة من الخبرة"
            options={channelOptions}
            values={state.ignoredChannelIds}
            onChange={(v) => setState({ ...state, ignoredChannelIds: v })}
            emptyText="لا توجد رومات"
          />
          <MultiSelect
            label="رتب مستثناة من الخبرة"
            options={roleOptions}
            values={state.ignoredRoleIds}
            onChange={(v) => setState({ ...state, ignoredRoleIds: v })}
            emptyText="لا توجد رتب"
          />
        </div>
      </section>

      <SaveButton onSave={() => saveLevelingConfig(guildId, state)} />
    </div>
  );
}
