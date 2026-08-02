"use client";

import { useState } from "react";
import { IGuildConfig } from "@thez/shared/client";
import { DiscordChannel } from "@/lib/discord";
import Toggle from "@/components/form/Toggle";
import ChannelSelect from "@/components/form/ChannelSelect";
import SaveButton from "@/components/form/SaveButton";
import { saveLoggingConfig } from "./actions";

type LoggingConfig = IGuildConfig["logging"];
type LoggingChannelKey = keyof LoggingConfig["channels"];

const CHANNEL_FIELDS: { key: LoggingChannelKey; label: string; icon: string }[] = [
  { key: "moderation", label: "الإشراف", icon: "🛡️" },
  { key: "members", label: "الأعضاء", icon: "�" },
  { key: "messages", label: "الرسائل", icon: "�" },
  { key: "voice", label: "الصوت", icon: "🎙️" },
  { key: "actions", label: "الإجراءات", icon: "⚡" },
  { key: "files", label: "الملفات", icon: "�" },
  { key: "server", label: "السيرفر", icon: "🖥️" },
  { key: "roles", label: "الرتب", icon: "🎖️" },
  { key: "channels", label: "الرومات", icon: "📁" },
  { key: "other", label: "أخرى", icon: "�" }
];

export default function LoggingForm({
  guildId,
  initial,
  channels
}: {
  guildId: string;
  initial: LoggingConfig;
  channels: DiscordChannel[];
}) {
  const [state, setState] = useState<LoggingConfig>(initial);

  return (
    <div className="flex flex-col gap-6">
      <section className="card flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">📋 السجلات</h2>
          <Toggle
            checked={state.enabled}
            onChange={(v) => setState({ ...state, enabled: v })}
            label={state.enabled ? "مفعّل" : "معطّل"}
          />
        </div>

        <div>
          <label className="label">📁 تصنيف السجلات (لأمر setup-logs)</label>
          <ChannelSelect
            label="اختر التصنيف"
            channels={channels}
            types={[4]}
            value={state.categoryId ?? ""}
            onChange={(v) => setState({ ...state, categoryId: v })}
          />
          <p className="text-sm text-gray-500 mt-1">سيتم إنشاء رومات اللوق في هذا التصنيف عند استخدام أمر /setup-logs</p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CHANNEL_FIELDS.map((field) => (
            <ChannelSelect
              key={field.key}
              label={`${field.icon} ${field.label}`}
              channels={channels}
              types={[0, 5]}
              value={state.channels[field.key] ?? ""}
              onChange={(v) =>
                setState({ ...state, channels: { ...state.channels, [field.key]: v } })
              }
            />
          ))}
        </div>
      </section>

      <SaveButton onSave={() => saveLoggingConfig(guildId, state)} />
    </div>
  );
}
