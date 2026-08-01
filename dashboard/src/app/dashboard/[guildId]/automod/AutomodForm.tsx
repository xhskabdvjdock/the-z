"use client";

import { useState } from "react";
import { DiscordChannel, DiscordRole } from "@/lib/discord";
import Toggle from "@/components/form/Toggle";
import RoleSelect from "@/components/form/RoleSelect";
import MultiSelect from "@/components/form/MultiSelect";
import SaveButton from "@/components/form/SaveButton";
import { saveAutomodConfig, AutomodInput } from "./actions";

const PUNISHMENT_LABELS: Record<AutomodInput["punishment"], string> = {
  delete: "حذف الرسالة فقط",
  warn: "تحذير",
  mute: "كتم",
  kick: "طرد",
  ban: "حظر"
};

export default function AutomodForm({
  guildId,
  initial,
  channels,
  roles
}: {
  guildId: string;
  initial: AutomodInput;
  channels: DiscordChannel[];
  roles: DiscordRole[];
}) {
  const [state, setState] = useState<AutomodInput>(initial);
  const [badWordsText, setBadWordsText] = useState(initial.badWords.join("\n"));

  const channelOptions = channels
    .filter((c) => c.type === 0 || c.type === 5)
    .map((c) => ({ id: c.id, label: `# ${c.name}` }));
  const roleOptions = roles.map((r) => ({ id: r.id, label: `@${r.name}` }));

  const handleSave = () => {
    const badWords = badWordsText
      .split("\n")
      .map((w) => w.trim())
      .filter((w) => w.length > 0);
    return saveAutomodConfig(guildId, { ...state, badWords });
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="card flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">🛡️ الرقابة التلقائية</h2>
          <Toggle
            checked={state.enabled}
            onChange={(v) => setState({ ...state, enabled: v })}
            label={state.enabled ? "مفعّل" : "معطّل"}
          />
        </div>

        <div className="flex flex-wrap gap-6">
          <Toggle
            checked={state.antiInvite}
            onChange={(v) => setState({ ...state, antiInvite: v })}
            label="منع روابط الدعوات"
          />
          <Toggle
            checked={state.antiLink}
            onChange={(v) => setState({ ...state, antiLink: v })}
            label="منع الروابط"
          />
        </div>
      </section>

      <section className="card flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">💬 منع السبام</h2>
          <Toggle
            checked={state.antiSpam.enabled}
            onChange={(v) => setState({ ...state, antiSpam: { ...state.antiSpam, enabled: v } })}
            label={state.antiSpam.enabled ? "مفعّل" : "معطّل"}
          />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label">أقصى عدد رسائل</label>
            <input
              type="number"
              className="input"
              value={state.antiSpam.maxMessages}
              onChange={(e) =>
                setState({ ...state, antiSpam: { ...state.antiSpam, maxMessages: Number(e.target.value) } })
              }
            />
          </div>
          <div>
            <label className="label">خلال (ثواني)</label>
            <input
              type="number"
              className="input"
              value={state.antiSpam.perSeconds}
              onChange={(e) =>
                setState({ ...state, antiSpam: { ...state.antiSpam, perSeconds: Number(e.target.value) } })
              }
            />
          </div>
        </div>
      </section>

      <section className="card flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">🔔 منع الإشارات الكثيرة</h2>
          <Toggle
            checked={state.antiMention.enabled}
            onChange={(v) => setState({ ...state, antiMention: { ...state.antiMention, enabled: v } })}
            label={state.antiMention.enabled ? "مفعّل" : "معطّل"}
          />
        </div>
        <div>
          <label className="label">أقصى عدد إشارات (Mentions)</label>
          <input
            type="number"
            className="input"
            value={state.antiMention.maxMentions}
            onChange={(e) =>
              setState({ ...state, antiMention: { ...state.antiMention, maxMentions: Number(e.target.value) } })
            }
          />
        </div>
      </section>

      <section className="card flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">🔠 منع الأحرف الكبيرة (Caps)</h2>
          <Toggle
            checked={state.antiCaps.enabled}
            onChange={(v) => setState({ ...state, antiCaps: { ...state.antiCaps, enabled: v } })}
            label={state.antiCaps.enabled ? "مفعّل" : "معطّل"}
          />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label">نسبة الأحرف الكبيرة المسموحة (%)</label>
            <input
              type="number"
              className="input"
              value={state.antiCaps.percentThreshold}
              onChange={(e) =>
                setState({ ...state, antiCaps: { ...state.antiCaps, percentThreshold: Number(e.target.value) } })
              }
            />
          </div>
          <div>
            <label className="label">أقل طول للرسالة (حرف)</label>
            <input
              type="number"
              className="input"
              value={state.antiCaps.minLength}
              onChange={(e) =>
                setState({ ...state, antiCaps: { ...state.antiCaps, minLength: Number(e.target.value) } })
              }
            />
          </div>
        </div>
      </section>

      <section className="card flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">🔁 منع تكرار الأحرف</h2>
          <Toggle
            checked={state.antiRepeat.enabled}
            onChange={(v) => setState({ ...state, antiRepeat: { ...state.antiRepeat, enabled: v } })}
            label={state.antiRepeat.enabled ? "مفعّل" : "معطّل"}
          />
        </div>
        <div>
          <label className="label">أقصى عدد لتكرار نفس الحرف</label>
          <input
            type="number"
            className="input"
            value={state.antiRepeat.maxRepeats}
            onChange={(e) =>
              setState({ ...state, antiRepeat: { ...state.antiRepeat, maxRepeats: Number(e.target.value) } })
            }
          />
        </div>
      </section>

      <section className="card flex flex-col gap-4">
        <h2 className="text-lg font-bold">🤬 الكلمات الممنوعة</h2>
        <div>
          <label className="label">كل كلمة في سطر منفصل</label>
          <textarea
            className="input min-h-[140px]"
            value={badWordsText}
            onChange={(e) => setBadWordsText(e.target.value)}
            placeholder={"كلمة1\nكلمة2\nكلمة3"}
          />
        </div>
      </section>

      <section className="card flex flex-col gap-4">
        <h2 className="text-lg font-bold">✅ الاستثناءات</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <MultiSelect
            label="رتب مستثناة"
            options={roleOptions}
            values={state.whitelistRoleIds}
            onChange={(v) => setState({ ...state, whitelistRoleIds: v })}
            emptyText="لا توجد رتب"
          />
          <MultiSelect
            label="رومات مستثناة"
            options={channelOptions}
            values={state.whitelistChannelIds}
            onChange={(v) => setState({ ...state, whitelistChannelIds: v })}
            emptyText="لا توجد رومات"
          />
        </div>
      </section>

      <section className="card flex flex-col gap-4">
        <h2 className="text-lg font-bold">⚖️ العقوبة</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label">نوع العقوبة</label>
            <select
              className="input"
              value={state.punishment}
              onChange={(e) => setState({ ...state, punishment: e.target.value as AutomodInput["punishment"] })}
            >
              {Object.entries(PUNISHMENT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          {state.punishment === "mute" && (
            <RoleSelect
              label="رتبة الكتم"
              roles={roles}
              value={state.muteRoleId ?? ""}
              onChange={(v) => setState({ ...state, muteRoleId: v })}
            />
          )}
        </div>
      </section>

      <SaveButton onSave={handleSave} />
    </div>
  );
}
