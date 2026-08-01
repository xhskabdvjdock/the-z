"use client";

import { DiscordRole } from "@/lib/discord";

export default function RoleSelect({
  roles,
  value,
  onChange,
  placeholder = "بدون",
  label
}: {
  roles: DiscordRole[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
}) {
  return (
    <div>
      {label && <label className="label">{label}</label>}
      <select className="input" value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
        <option value="">{placeholder}</option>
        {roles.map((r) => (
          <option key={r.id} value={r.id}>
            @{r.name}
          </option>
        ))}
      </select>
    </div>
  );
}
