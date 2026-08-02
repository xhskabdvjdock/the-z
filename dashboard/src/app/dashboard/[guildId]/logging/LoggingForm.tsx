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
type CustomChannelKey = keyof LoggingConfig["customChannels"];

const CHANNEL_FIELDS: { key: LoggingChannelKey; label: string; icon: string }[] = [
  { key: "moderation", label: "الإشراف", icon: "🛡️" },
  { key: "members", label: "الأعضاء", icon: "👥" },
  { key: "messages", label: "الرسائل", icon: "💬" },
  { key: "voice", label: "الصوت", icon: "🎙️" },
  { key: "actions", label: "الإجراءات", icon: "⚡" },
  { key: "files", label: "الملفات", icon: "📎" },
  { key: "server", label: "السيرفر", icon: "🖥️" },
  { key: "roles", label: "الرتب", icon: "🎖️" },
  { key: "channels", label: "الرومات", icon: "📁" },
  { key: "other", label: "أخرى", icon: "📋" }
];

const CUSTOM_CHANNEL_FIELDS: { key: CustomChannelKey; label: string; icon: string }[] = [
  { key: "media", label: "الصور والفيديوهات", icon: "🎬" },
  { key: "stickers", label: "الملصقات", icon: "🏷️" }
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

      <section className="card flex flex-col gap-4">
        <h2 className="text-lg font-bold">🔧 القنوات المخصصة</h2>
        <p className="text-sm text-gray-500">اختر قنوات مخصصة لأنواع محددة من المحتوى</p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {CUSTOM_CHANNEL_FIELDS.map((field) => (
            <div key={field.key} className="flex flex-col gap-2">
              <label className="label">{`${field.icon} ${field.label}`}</label>
              <div className="flex flex-col gap-2">
                {channels.map((channel) => (
                  <label key={channel.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={(state.customChannels?.[field.key] ?? []).includes(channel.id)}
                      onChange={(e) => {
                        const current = state.customChannels?.[field.key] ?? [];
                        if (e.target.checked) {
                          setState({
                            ...state,
                            customChannels: {
                              ...state.customChannels,
                              [field.key]: [...current, channel.id]
                            }
                          });
                        } else {
                          setState({
                            ...state,
                            customChannels: {
                              ...state.customChannels,
                              [field.key]: current.filter((id) => id !== channel.id)
                            }
                          });
                        }
                      }}
                      className="rounded"
                    />
                    <span>{channel.name}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <SaveButton onSave={() => saveLoggingConfig(guildId, state)} />
    </div>
  );
}
