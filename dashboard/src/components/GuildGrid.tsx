"use client";

import { useState, useMemo } from "react";
import GuildCard from "./GuildCard";
import { ManageableGuild } from "@/lib/discord";

export default function GuildGrid({ guilds }: { guilds: ManageableGuild[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return guilds;
    const q = query.toLowerCase();
    return guilds.filter((g) => g.name.toLowerCase().includes(q) || g.id.includes(q));
  }, [guilds, query]);

  return (
    <div>
      <div className="mb-6">
        <input
          type="text"
          placeholder="ابحث عن سيرفر..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="input w-full max-w-md"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="card text-center text-slate-500 dark:text-slate-400">
          لا توجد نتائج للبحث "{query}"
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((g) => (
            <GuildCard key={g.id} guild={g} />
          ))}
        </div>
      )}
    </div>
  );
}