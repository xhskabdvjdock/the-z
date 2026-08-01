"use client";

import { useState } from "react";
import { IGuildConfig } from "@thez/shared/client";
import { DiscordChannel, DiscordRole } from "@/lib/discord";
import Toggle from "@/components/form/Toggle";
import ChannelSelect from "@/components/form/ChannelSelect";
import RoleSelect from "@/components/form/RoleSelect";
import SaveButton from "@/components/form/SaveButton";
import { saveCaptchaConfig } from "./actions";

type CaptchaConfig = IGuildConfig["captcha"];

export default function CaptchaForm({
  guildId,
  initial,
  channels,
  roles
}: {
  guildId: string;
  initial: CaptchaConfig;
  channels: DiscordChannel[];
  roles: DiscordRole[];
}) {
  const [state, setState] = useState<CaptchaConfig>(initial);

  return (
    <div className="flex flex-col gap-6">
      <div className="card bg-slate-50 text-sm text-slate-600 dark:bg-slate-800/50 dark:text-slate-300">
        <p>
          <strong>آلية العمل:</strong> عند انضمام عضو جديد، يُمنح الرتبة المؤقتة (غير موثّق) ويُطلب
          منه الضغط على زر التحقق في الروم المحدد. بعد الضغط تُستبدل رتبته بالرتبة الموثّقة. إن لم
          يتحقق خلال المدة المحددة، يُطرد تلقائياً من السيرفر.
        </p>
      </div>

      <section className="card flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">🔐 نظام التحقق</h2>
          <Toggle
            checked={state.enabled}
            onChange={(v) => setState({ ...state, enabled: v })}
            label={state.enabled ? "مفعّل" : "معطّل"}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <ChannelSelect
            label="روم إرسال التحقق"
            channels={channels}
            types={[0, 5]}
            value={state.channelId ?? ""}
            onChange={(v) => setState({ ...state, channelId: v })}
          />

          <div>
            <label className="label">مدة الإمهال قبل الطرد التلقائي (بالدقائق)</label>
            <input
              type="number"
              min={1}
              className="input"
              value={state.kickAfterMinutes}
              onChange={(e) => setState({ ...state, kickAfterMinutes: Number(e.target.value) })}
            />
          </div>

          <RoleSelect
            label="الرتبة المؤقتة (قبل التحقق)"
            roles={roles}
            value={state.unverifiedRoleId ?? ""}
            onChange={(v) => setState({ ...state, unverifiedRoleId: v })}
          />

          <RoleSelect
            label="الرتبة بعد التحقق"
            roles={roles}
            value={state.verifiedRoleId ?? ""}
            onChange={(v) => setState({ ...state, verifiedRoleId: v })}
          />
        </div>
      </section>

      <SaveButton onSave={() => saveCaptchaConfig(guildId, state)} />
    </div>
  );
}
