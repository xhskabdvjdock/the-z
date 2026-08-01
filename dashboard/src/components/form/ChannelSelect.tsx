"use client";

import { DiscordChannel } from "@/lib/discord";

// أنواع الرومات في Discord API: 0=نصي 2=صوتي 4=تصنيف 5=إعلانات 15=منتدى
const TYPE_LABELS: Record<number, string> = {
  0: "💬",
  2: "🎙️",
  4: "📁",
  5: "📢",
  15: "🗂️"
};

export default function ChannelSelect({
  channels,
  value,
  onChange,
  types,
  placeholder = "بدون",
  label
}: {
  channels: DiscordChannel[];
  value: string;
  onChange: (value: string) => void;
  types?: number[];
  placeholder?: string;
  label?: string;
}) {
  const filtered = types ? channels.filter((c) => types.includes(c.type)) : channels;

  return (
    <div>
      {label && <label className="label">{label}</label>}
      <select className="input" value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
        <option value="">{placeholder}</option>
        {filtered.map((c) => (
          <option key={c.id} value={c.id}>
            {TYPE_LABELS[c.type] ?? "#"} {c.name}
          </option>
        ))}
      </select>
    </div>
  );
}
