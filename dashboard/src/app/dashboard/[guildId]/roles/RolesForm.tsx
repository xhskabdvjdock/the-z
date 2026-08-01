"use client";

import { useState } from "react";
import { IColorRole, ISelfRoleOption, ISelfRolePanel } from "@thez/shared/client";
import { DiscordRole } from "@/lib/discord";
import Toggle from "@/components/form/Toggle";
import RoleSelect from "@/components/form/RoleSelect";
import MultiSelect from "@/components/form/MultiSelect";
import SaveButton from "@/components/form/SaveButton";
import { saveRolesConfig, RolesConfigInput } from "./actions";

function createEmptyColorRole(): IColorRole {
  return { roleId: "", name: "لون جديد", allowedRoleIds: [] };
}

function createEmptySelfRolePanel(): ISelfRolePanel {
  return { id: Date.now().toString(), title: "اختر رتبتك", type: "button", maxRoles: 0, options: [] };
}

function createEmptySelfRoleOption(): ISelfRoleOption {
  return { roleId: "", label: "" };
}

export default function RolesForm({
  guildId,
  initial,
  roles
}: {
  guildId: string;
  initial: RolesConfigInput;
  roles: DiscordRole[];
}) {
  const [state, setState] = useState<RolesConfigInput>(initial);

  const roleOptions = roles.map((r) => ({ id: r.id, label: `@${r.name}` }));

  const updateColorRole = (index: number, patch: Partial<IColorRole>) => {
    const next = [...state.colors.roles];
    next[index] = { ...next[index], ...patch };
    setState({ ...state, colors: { ...state.colors, roles: next } });
  };

  const removeColorRole = (index: number) => {
    setState({ ...state, colors: { ...state.colors, roles: state.colors.roles.filter((_, i) => i !== index) } });
  };

  const updatePanel = (id: string, patch: Partial<ISelfRolePanel>) => {
    setState({ ...state, selfRoles: state.selfRoles.map((p) => (p.id === id ? { ...p, ...patch } : p)) });
  };

  const removePanel = (id: string) => {
    setState({ ...state, selfRoles: state.selfRoles.filter((p) => p.id !== id) });
  };

  const updatePanelOption = (panelId: string, index: number, patch: Partial<ISelfRoleOption>) => {
    const panel = state.selfRoles.find((p) => p.id === panelId);
    if (!panel) return;
    const nextOptions = [...panel.options];
    nextOptions[index] = { ...nextOptions[index], ...patch };
    updatePanel(panelId, { options: nextOptions });
  };

  const removePanelOption = (panelId: string, index: number) => {
    const panel = state.selfRoles.find((p) => p.id === panelId);
    if (!panel) return;
    updatePanel(panelId, { options: panel.options.filter((_, i) => i !== index) });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* الرتب التلقائية */}
      <section className="card flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">🆕 الرتب التلقائية</h2>
          <Toggle
            checked={state.autoRole.enabled}
            onChange={(v) => setState({ ...state, autoRole: { ...state.autoRole, enabled: v } })}
            label={state.autoRole.enabled ? "مفعّل" : "معطّل"}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <MultiSelect
            label="رتب تُعطى للأعضاء الجدد"
            options={roleOptions}
            values={state.autoRole.userRoleIds}
            onChange={(v) => setState({ ...state, autoRole: { ...state.autoRole, userRoleIds: v } })}
          />
          <MultiSelect
            label="رتب تُعطى للبوتات الجديدة"
            options={roleOptions}
            values={state.autoRole.botRoleIds}
            onChange={(v) => setState({ ...state, autoRole: { ...state.autoRole, botRoleIds: v } })}
          />
        </div>
      </section>

      {/* نظام الألوان */}
      <section className="card flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">🎨 نظام الألوان</h2>
          <Toggle
            checked={state.colors.enabled}
            onChange={(v) => setState({ ...state, colors: { ...state.colors, enabled: v } })}
            label={state.colors.enabled ? "مفعّل" : "معطّل"}
          />
        </div>

        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400">
            الألوان المتاحة ({state.colors.roles.length})
          </h3>
          <button
            type="button"
            className="btn-secondary"
            onClick={() =>
              setState({ ...state, colors: { ...state.colors, roles: [...state.colors.roles, createEmptyColorRole()] } })
            }
          >
            + إضافة لون جديد
          </button>
        </div>

        {state.colors.roles.length === 0 && (
          <p className="text-center text-sm text-slate-500 dark:text-slate-400">لا توجد ألوان بعد.</p>
        )}

        {state.colors.roles.map((colorRole, i) => (
          <div key={i} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold">{colorRole.name || "لون بلا اسم"}</h4>
              <button type="button" className="btn-danger !px-2 !py-1 text-xs" onClick={() => removeColorRole(i)}>
                🗑️ حذف
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <RoleSelect
                label="الرتبة"
                roles={roles}
                value={colorRole.roleId}
                onChange={(v) => updateColorRole(i, { roleId: v })}
              />
              <div>
                <label className="label">الاسم</label>
                <input
                  className="input"
                  value={colorRole.name}
                  onChange={(e) => updateColorRole(i, { name: e.target.value })}
                />
              </div>
              <div>
                <label className="label">إيموجي (اختياري)</label>
                <input
                  className="input"
                  value={colorRole.emoji ?? ""}
                  onChange={(e) => updateColorRole(i, { emoji: e.target.value })}
                />
              </div>
              <div>
                <label className="label">اللون</label>
                <input
                  type="color"
                  className="h-10 w-full rounded-lg border border-slate-300 dark:border-slate-700"
                  value={colorRole.hex ?? "#5865F2"}
                  onChange={(e) => updateColorRole(i, { hex: e.target.value })}
                />
              </div>
            </div>

            <MultiSelect
              label="مسموح فقط لهذه الرتب (فارغ = الجميع)"
              options={roleOptions}
              values={colorRole.allowedRoleIds}
              onChange={(v) => updateColorRole(i, { allowedRoleIds: v })}
            />
          </div>
        ))}
      </section>

      {/* الرتب الذاتية */}
      <section className="card flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">✅ الرتب الذاتية</h2>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setState({ ...state, selfRoles: [...state.selfRoles, createEmptySelfRolePanel()] })}
          >
            + إضافة لوحة جديدة
          </button>
        </div>

        {state.selfRoles.length === 0 && (
          <p className="text-center text-sm text-slate-500 dark:text-slate-400">
            لا توجد لوحات رتب ذاتية بعد.
          </p>
        )}

        {state.selfRoles.map((panel) => (
          <div key={panel.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold">{panel.title || "لوحة بلا عنوان"}</h4>
              <button type="button" className="btn-danger !px-2 !py-1 text-xs" onClick={() => removePanel(panel.id)}>
                🗑️ حذف اللوحة
              </button>
            </div>

            <div>
              <label className="label">معرّف اللوحة (استخدمه في أمر /selfrole-panel)</label>
              <input className="input" value={panel.id} disabled />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="label">العنوان</label>
                <input
                  className="input"
                  value={panel.title}
                  onChange={(e) => updatePanel(panel.id, { title: e.target.value })}
                />
              </div>
              <div>
                <label className="label">نوع العرض</label>
                <select
                  className="input"
                  value={panel.type}
                  onChange={(e) => updatePanel(panel.id, { type: e.target.value as ISelfRolePanel["type"] })}
                >
                  <option value="button">أزرار</option>
                  <option value="select">قائمة منسدلة</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="label">الوصف (اختياري)</label>
                <textarea
                  className="input min-h-[70px]"
                  value={panel.description ?? ""}
                  onChange={(e) => updatePanel(panel.id, { description: e.target.value })}
                />
              </div>
              <div>
                <label className="label">الحد الأقصى للرتب لكل عضو (0 = بلا حد)</label>
                <input
                  type="number"
                  min={0}
                  className="input"
                  value={panel.maxRoles ?? 0}
                  onChange={(e) => updatePanel(panel.id, { maxRoles: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <h5 className="text-sm font-bold text-slate-500 dark:text-slate-400">
                الرتب في هذه اللوحة ({panel.options.length})
              </h5>
              <button
                type="button"
                className="btn-secondary !px-2.5 !py-1 text-xs"
                onClick={() => updatePanel(panel.id, { options: [...panel.options, createEmptySelfRoleOption()] })}
              >
                + إضافة رتبة
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {panel.options.map((opt, i) => (
                <div
                  key={i}
                  className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 p-2 dark:bg-slate-800/50"
                >
                  <div className="!w-48">
                    <RoleSelect
                      roles={roles}
                      value={opt.roleId}
                      onChange={(v) => updatePanelOption(panel.id, i, { roleId: v })}
                    />
                  </div>
                  <input
                    className="input !w-32"
                    placeholder="النص الظاهر"
                    value={opt.label}
                    onChange={(e) => updatePanelOption(panel.id, i, { label: e.target.value })}
                  />
                  <input
                    className="input !w-20"
                    placeholder="إيموجي"
                    value={opt.emoji ?? ""}
                    onChange={(e) => updatePanelOption(panel.id, i, { emoji: e.target.value })}
                  />
                  <input
                    className="input flex-1"
                    placeholder="وصف (اختياري)"
                    value={opt.description ?? ""}
                    onChange={(e) => updatePanelOption(panel.id, i, { description: e.target.value })}
                  />
                  <button
                    type="button"
                    className="btn-danger !px-2 !py-1 text-xs"
                    onClick={() => removePanelOption(panel.id, i)}
                  >
                    حذف
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      <SaveButton onSave={() => saveRolesConfig(guildId, state)} />
    </div>
  );
}
