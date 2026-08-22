"use client";

import { useState } from "react";
import { IGuildConfig } from "@thez/shared/client";
import { DiscordChannel } from "@/lib/discord";
import Toggle from "@/components/form/Toggle";
import ChannelSelect from "@/components/form/ChannelSelect";
import SaveButton from "@/components/form/SaveButton";
import { saveAlwaysVoiceConfig } from "./actions";

export default function AlwaysVoiceForm({
  guildId,
  initial,
  channels
}: {
  guildId: string;
  initial: IGuildConfig["alwaysVoice"];
  channels: DiscordChannel[];
}) {
  const [state, setState] = useState<IGuildConfig["alwaysVoice"]>(initial);

  return (
    <section className="card flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">🧊 البوت المقيم في روم صوتي</h2>
        <Toggle
          checked={state.enabled}
          onChange={(v) => setState({ ...state, enabled: v })}
          label={state.enabled ? "مفعّل" : "معطّل"}
        />
      </div>

      <p className="text-sm text-slate-500 dark:text-slate-400">
        اختر رومًا صوتيًا يبقى فيه البوت دائمًا — يدخله فور التفعيل، ويعود إليه
        تلقائيًا حتى لو نُقل أو أُخرج منه.
      </p>

      <ChannelSelect
        label="الروم الصوتي المقيم"
        channels={channels}
        types={[2]}
        value={state.channelId ?? ""}
        onChange={(v) => setState({ ...state, channelId: v })}
      />

      <SaveButton onSave={() => saveAlwaysVoiceConfig(guildId, state)} />
    </section>
  );
}