"use client";

import { useState } from "react";
import { IGuildConfig } from "@thez/shared/client";
import { DiscordChannel } from "@/lib/discord";
import Toggle from "@/components/form/Toggle";
import ChannelSelect from "@/components/form/ChannelSelect";
import SaveButton from "@/components/form/SaveButton";
import { saveLoggingConfig } from "./actions";
import { Shield, Users, MessageSquare, Mic, Zap, FileText, Server, User, Hash, List, ExternalLink, Image, Lightbulb, KeyRound, Smile, UserX, Folder } from "lucide-react";

const ICONS: Record<string, React.ElementType> = {
  Shield,
  Users,
  MessageSquare,
  Mic,
  Zap,
  FileText,
  Server,
  User,
  Hash,
  List,
  ExternalLink,
  Image,
  Lightbulb,
  KeyRound,
  Smile,
  UserX,
  Folder
};

type LoggingConfig = IGuildConfig["logging"];
type LoggingChannelKey = keyof LoggingConfig["channels"];
type CustomChannelKey = keyof LoggingConfig["customChannels"];

const CHANNEL_FIELDS: { key: LoggingChannelKey; label: string; icon: keyof typeof ICONS }[] = [
  { key: "moderation", label: "الإشراف", icon: "Shield" },
  { key: "members", label: "الأعضاء", icon: "Users" },
  { key: "messages", label: "الرسائل", icon: "MessageSquare" },
  { key: "voice", label: "الصوت", icon: "Mic" },
  { key: "actions", label: "الإجراءات", icon: "Zap" },
  { key: "files", label: "الملفات", icon: "FileText" },
  { key: "server", label: "السيرفر", icon: "Server" },
  { key: "roles", label: "الرتب", icon: "User" },
  { key: "channels", label: "الرومات", icon: "Hash" },
  { key: "other", label: "أخرى", icon: "List" },
  { key: "invites", label: "الدعوات", icon: "ExternalLink" },
  { key: "gifblock", label: "حظر GIFs", icon: "Image" },
  { key: "suggestions", label: "الاقتراحات", icon: "Lightbulb" },
  { key: "access", label: "إدارة الوصول", icon: "KeyRound" },
  { key: "leveling", label: "المستويات", icon: "Zap" },
  { key: "jail", label: "السجن", icon: "UserX" },
  { key: "reactionroles", label: "رولات الرياكشن", icon: "Smile" }
];

const CUSTOM_CHANNEL_FIELDS: { key: CustomChannelKey; label: string; icon: keyof typeof ICONS }[] = [
  { key: "messages", label: "الرسائل", icon: "MessageSquare" },
  { key: "commands", label: "الأوامر", icon: "Zap" },
  { key: "media", label: "الصور والفيديوهات", icon: "Image" },
  { key: "stickers", label: "الملصقات", icon: "Folder" }
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
          {CHANNEL_FIELDS.map((field) => {
            const Icon = ICONS[field.icon];
            return (
              <ChannelSelect
                key={field.key}
                label={`${field.label}`}
                channels={channels}
                types={[0, 5]}
                value={state.channels[field.key] ?? ""}
                onChange={(v) =>
                  setState({ ...state, channels: { ...state.channels, [field.key]: v } })
                }
              />
            );
          })}
        </div>
      </section>

      <section className="card flex flex-col gap-4">
        <h2 className="text-lg font-bold">🔧 القنوات المخصصة</h2>
        <p className="text-sm text-gray-500">اختر قنوات مخصصة لأنواع محددة من المحتوى</p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {CUSTOM_CHANNEL_FIELDS.map((field) => {
            const Icon = ICONS[field.icon];
            return (
              <div key={field.key} className="flex flex-col gap-2">
                <label className="label flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  {field.label}
                </label>
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
            );
          })}
        </div>
      </section>

      <SaveButton onSave={() => saveLoggingConfig(guildId, state)} />
    </div>
  );
}
