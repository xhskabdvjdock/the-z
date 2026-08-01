"use client";

import { useState } from "react";
import { IAutoResponse } from "@thez/shared/client";
import { DiscordChannel } from "@/lib/discord";
import Toggle from "@/components/form/Toggle";
import MultiSelect from "@/components/form/MultiSelect";
import CustomMessageEditor from "@/components/form/CustomMessageEditor";
import SaveButton from "@/components/form/SaveButton";
import { saveAutoResponses } from "./actions";

const MATCH_TYPES: { value: IAutoResponse["matchType"]; label: string }[] = [
  { value: "exact", label: "تطابق تام" },
  { value: "contains", label: "يحتوي على" },
  { value: "startsWith", label: "يبدأ بـ" },
  { value: "regex", label: "تعبير نمطي (Regex)" }
];

function createEmptyAutoResponse(): IAutoResponse {
  return {
    id: crypto.randomUUID(),
    trigger: "",
    matchType: "contains",
    enabled: true,
    deleteTrigger: false,
    channelIds: [],
    response: { enabled: true, content: "" }
  };
}

export default function AutoResponseForm({
  guildId,
  initial,
  channels
}: {
  guildId: string;
  initial: IAutoResponse[];
  channels: DiscordChannel[];
}) {
  const [items, setItems] = useState<IAutoResponse[]>(initial);

  const channelOptions = channels
    .filter((c) => c.type === 0 || c.type === 5)
    .map((c) => ({ id: c.id, label: `# ${c.name}` }));

  const updateItem = (id: string, patch: Partial<IAutoResponse>) => {
    setItems(items.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  };

  const removeItem = (id: string) => {
    setItems(items.filter((it) => it.id !== id));
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">📋 قائمة الردود ({items.length})</h2>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => setItems([...items, createEmptyAutoResponse()])}
        >
          + إضافة رد تلقائي
        </button>
      </div>

      {items.length === 0 && (
        <div className="card text-center text-sm text-slate-500 dark:text-slate-400">
          لا توجد ردود تلقائية بعد. اضغط "إضافة رد تلقائي" للبدء.
        </div>
      )}

      {items.map((item) => (
        <section key={item.id} className="card flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <Toggle
              checked={item.enabled}
              onChange={(v) => updateItem(item.id, { enabled: v })}
              label={item.enabled ? "مفعّل" : "معطّل"}
            />
            <button type="button" className="btn-danger" onClick={() => removeItem(item.id)}>
              🗑️ حذف
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="label">الكلمة أو العبارة المُحفِّزة</label>
              <input
                className="input"
                placeholder="مثال: مرحبا"
                value={item.trigger}
                onChange={(e) => updateItem(item.id, { trigger: e.target.value })}
              />
            </div>
            <div>
              <label className="label">نوع المطابقة</label>
              <select
                className="input"
                value={item.matchType}
                onChange={(e) =>
                  updateItem(item.id, { matchType: e.target.value as IAutoResponse["matchType"] })
                }
              >
                {MATCH_TYPES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Toggle
            checked={item.deleteTrigger}
            onChange={(v) => updateItem(item.id, { deleteTrigger: v })}
            label="حذف رسالة العضو بعد الرد"
          />

          <MultiSelect
            label="الرومات المسموحة (فارغ = كل الرومات)"
            options={channelOptions}
            values={item.channelIds}
            onChange={(v) => updateItem(item.id, { channelIds: v })}
          />

          <CustomMessageEditor
            value={item.response}
            onChange={(msg) => updateItem(item.id, { response: msg })}
          />
        </section>
      ))}

      <SaveButton onSave={() => saveAutoResponses(guildId, items)} />
    </div>
  );
}
