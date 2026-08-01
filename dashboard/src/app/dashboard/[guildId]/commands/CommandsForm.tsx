"use client";

import { useState } from "react";
import { CommandMeta, ICommandOverride, ICustomMessage } from "@thez/shared/client";
import { DiscordChannel, DiscordRole } from "@/lib/discord";
import Toggle from "@/components/form/Toggle";
import MultiSelect from "@/components/form/MultiSelect";
import CustomMessageEditor from "@/components/form/CustomMessageEditor";
import SaveButton from "@/components/form/SaveButton";
import { saveCommandOverrides } from "./actions";

export interface CommandRow extends ICommandOverride {
  category: CommandMeta["category"];
  descriptionAr: string;
}

const CATEGORY_ORDER: CommandMeta["category"][] = [
  "عام",
  "إشراف",
  "تذاكر",
  "رومات صوتية",
  "مستويات",
  "رولات"
];

const TEXT_CHANNEL_TYPES = [0, 5];

export default function CommandsForm({
  guildId,
  commands,
  channels,
  roles
}: {
  guildId: string;
  commands: CommandRow[];
  channels: DiscordChannel[];
  roles: DiscordRole[];
}) {
  const [state, setState] = useState<CommandRow[]>(commands);

  const updateCommand = (name: string, patch: Partial<CommandRow>) => {
    setState((prev) => prev.map((cmd) => (cmd.name === name ? { ...cmd, ...patch } : cmd)));
  };

  const roleOptions = roles.map((r) => ({ id: r.id, label: r.name }));
  const channelOptions = channels
    .filter((c) => TEXT_CHANNEL_TYPES.includes(c.type))
    .map((c) => ({ id: c.id, label: `#${c.name}` }));

  const groups = CATEGORY_ORDER.map((category) => ({
    category,
    items: state.filter((cmd) => cmd.category === category)
  })).filter((g) => g.items.length > 0);

  const handleSave = () => {
    const overrides: ICommandOverride[] = state.map(({ category, descriptionAr, ...rest }) => rest);
    return saveCommandOverrides(guildId, overrides);
  };

  return (
    <div className="flex flex-col gap-6 pb-4">
      {groups.map((group) => (
        <section key={group.category} className="card flex flex-col gap-3">
          <h2 className="text-lg font-bold">{group.category}</h2>
          <div className="flex flex-col gap-2">
            {group.items.map((cmd) => {
              const customResponse: ICustomMessage = cmd.customResponse ?? { enabled: false };

              return (
                <details
                  key={cmd.name}
                  className="rounded-lg border border-slate-200 dark:border-slate-800"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="font-semibold">
                        {cmd.name}
                        {!cmd.enabled && (
                          <span className="mr-2 text-xs font-normal text-red-500">(معطّل)</span>
                        )}
                      </span>
                      <span className="truncate text-xs text-slate-500 dark:text-slate-400">
                        {cmd.descriptionAr}
                      </span>
                    </div>
                    <span onClick={(e) => e.stopPropagation()}>
                      <Toggle
                        checked={cmd.enabled}
                        onChange={(v) => updateCommand(cmd.name, { enabled: v })}
                      />
                    </span>
                  </summary>

                  <div className="flex flex-col gap-4 border-t border-slate-200 p-4 dark:border-slate-800">
                    <div>
                      <label className="label">بديل اسم الأمر (Alias)</label>
                      <input
                        className="input"
                        placeholder={cmd.name}
                        value={cmd.alias ?? ""}
                        onChange={(e) => updateCommand(cmd.name, { alias: e.target.value })}
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-6">
                      <Toggle
                        checked={cmd.slashEnabled}
                        onChange={(v) => updateCommand(cmd.name, { slashEnabled: v })}
                        label="أمر Slash (/)"
                      />
                      <Toggle
                        checked={cmd.prefixEnabled}
                        onChange={(v) => updateCommand(cmd.name, { prefixEnabled: v })}
                        label="أمر بادئة (Prefix)"
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <MultiSelect
                        label="الرولات المسموح لها"
                        options={roleOptions}
                        values={cmd.allowedRoleIds}
                        onChange={(v) => updateCommand(cmd.name, { allowedRoleIds: v })}
                        emptyText="لا توجد رولات"
                      />
                      <MultiSelect
                        label="الرولات الممنوعة"
                        options={roleOptions}
                        values={cmd.deniedRoleIds}
                        onChange={(v) => updateCommand(cmd.name, { deniedRoleIds: v })}
                        emptyText="لا توجد رولات"
                      />
                      <MultiSelect
                        label="الرومات المسموح بها"
                        options={channelOptions}
                        values={cmd.allowedChannelIds}
                        onChange={(v) => updateCommand(cmd.name, { allowedChannelIds: v })}
                        emptyText="لا توجد رومات"
                      />
                      <MultiSelect
                        label="الرومات الممنوعة"
                        options={channelOptions}
                        values={cmd.deniedChannelIds}
                        onChange={(v) => updateCommand(cmd.name, { deniedChannelIds: v })}
                        emptyText="لا توجد رومات"
                      />
                    </div>

                    <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
                      <Toggle
                        checked={!!customResponse.enabled}
                        onChange={(v) =>
                          updateCommand(cmd.name, { customResponse: { ...customResponse, enabled: v } })
                        }
                        label="رد مخصص عند استخدام الأمر"
                      />
                      {customResponse.enabled && (
                        <CustomMessageEditor
                          value={customResponse}
                          onChange={(msg) => updateCommand(cmd.name, { customResponse: msg })}
                        />
                      )}
                    </div>
                  </div>
                </details>
              );
            })}
          </div>
        </section>
      ))}

      <div className="sticky bottom-4 z-10">
        <div className="card !py-3 shadow-lg">
          <SaveButton onSave={handleSave} />
        </div>
      </div>
    </div>
  );
}
