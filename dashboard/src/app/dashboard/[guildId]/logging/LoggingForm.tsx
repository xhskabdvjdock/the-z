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
  { key: "messageDelete", label: "حذف الرسائل", icon: "🗑️" },
  { key: "messageEdit", label: "تعديل الرسائل", icon: "✏️" },
  { key: "memberJoin", label: "انضمام الأعضاء", icon: "📥" },
  { key: "memberLeave", label: "مغادرة الأعضاء", icon: "📤" },
  { key: "memberUpdate", label: "تحديث بيانات الأعضاء", icon: "🧑‍🤝‍🧑" },
  { key: "voiceUpdate", label: "الحركة الصوتية", icon: "🎙️" },
  { key: "channelUpdate", label: "تعديلات الرومات", icon: "📁" },
  { key: "roleUpdate", label: "تعديلات الرتب", icon: "🎖️" },
  { key: "moderation", label: "الإجراءات الإشرافية", icon: "🛡️" },
  { key: "server", label: "عام / متفرقات", icon: "📋" },
  { key: "commandUsage", label: "استخدام الأوامر", icon: "⚡" },
  { key: "ticketCreate", label: "إنشاء التذاكر", icon: "🎫" },
  { key: "ticketClose", label: "إغلاق التذاكر", icon: "🔒" },
  { key: "levelUp", label: "صعود المستويات", icon: "⬆️" },
  { key: "reactionAdd", label: "إضافة التفاعلات", icon: "👍" },
  { key: "reactionRemove", label: "إزالة التفاعلات", icon: "👎" },
  { key: "threadCreate", label: "إنشاء المواضيع", icon: "🧵" },
  { key: "threadDelete", label: "حذف المواضيع", icon: "✂️" },
  { key: "inviteCreate", label: "إنشاء الدعوات", icon: "✉️" },
  { key: "inviteDelete", label: "حذف الدعوات", icon: "🗑️" },
  { key: "emojiCreate", label: "إنشاء الإيموجي", icon: "😀" },
  { key: "emojiDelete", label: "حذف الإيموجي", icon: "😢" },
  { key: "emojiUpdate", label: "تعديل الإيموجي", icon: "🔄" },
  { key: "stickerCreate", label: "إنشاء الملصقات", icon: "🏷️" },
  { key: "stickerDelete", label: "حذف الملصقات", icon: "🗑️" }
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
