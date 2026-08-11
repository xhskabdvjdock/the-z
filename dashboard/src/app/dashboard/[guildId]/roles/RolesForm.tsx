"use client";

import { useState } from "react";
import { IColorRole, ISelfRoleOption, ISelfRolePanel } from "@thez/shared/client";
import { DiscordChannel, DiscordRole } from "@/lib/discord";
import Toggle from "@/components/form/Toggle";
import RoleSelect from "@/components/form/RoleSelect";
import MultiSelect from "@/components/form/MultiSelect";
import ChannelSelect from "@/components/form/ChannelSelect";
import SaveButton from "@/components/form/SaveButton";
import { saveRolesConfig, publishRolePanel, RolesConfigInput } from "./actions";

function createEmptyColorRole(): IColorRole {
  return { roleId: "", name: "لون جديد", allowedRoleIds: [] };
}

function createEmptySelfRolePanel(): ISelfRolePanel {
  return {
    id: Date.now().toString(),
    title: "اختر رتبتك",
    type: "button",
    maxRoles: 0,
    enabled: true,
    color: "#5865F2",
    options: []
  };
}

function createEmptySelfRoleOption(): ISelfRoleOption {
  return { roleId: "", label: "" };
}

export default function RolesForm({
  guildId,
  initial,
  roles,
  channels
}: {
  guildId: string;
  initial: RolesConfigInput;
  roles: DiscordRole[];
  channels: DiscordChannel[];
}) {
  const [state, setState] = useState<RolesConfigInput>(initial);
  const [publishStatus, setPublishStatus] = useState<Record<string, string>>({});

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

  const movePanelOption = (panelId: string, index: number, dir: -1 | 1) => {
    const panel = state.selfRoles.find((p) => p.id === panelId);
    if (!panel) return;
    const next = [...panel.options];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    updatePanel(panelId, { options: next });
  };

  async function handlePublish(panel: ISelfRolePanel) {
    setPublishStatus((s) => ({ ...s, [panel.id]: "⏳ جاري النشر/التحديث..." }));
    try {
      const res = await publishRolePanel(guildId, panel);
      setPublishStatus((s) => ({
        ...s,
        [panel.id]: res.updated ? "✅ تم تحديث الرسالة المنشورة" : "✅ تم نشر اللوحة في القناة"
      }));
    } catch (err) {
      setPublishStatus((s) => ({
        ...s,
        [panel.id]: `❌ ${err instanceof Error ? err.message : String(err)}`
      }));
    }
  }

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

      {/* لوحات الرتب (Role Panels) */}
      <section className="card flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">🎛️ Role Panels (لوحات الرتب)</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              لوحات اختيار الرتب بأزرار أو قوائم منسدلة — انشرها في قناة وحدّثها لاحقًا بضغطة.
            </p>
          </div>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setState({ ...state, selfRoles: [...state.selfRoles, createEmptySelfRolePanel()] })}
          >
            + إنشاء لوحة جديدة
          </button>
        </div>

        {state.selfRoles.length === 0 && (
          <p className="text-center text-sm text-slate-500 dark:text-slate-400">
            لا توجد لوحات رتب بعد — أنشئ لوحتك الأولى.
          </p>
        )}

        {state.selfRoles.map((panel) => (
          <div key={panel.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold">{panel.title || "لوحة بلا عنوان"}</h4>
              <div className="flex items-center gap-3">
                <Toggle
                  checked={panel.enabled !== false}
                  onChange={(v) => updatePanel(panel.id, { enabled: v })}
                  label={panel.enabled === false ? "معطّل" : "مفعّل"}
                />
                <button type="button" className="btn-danger !px-2 !py-1 text-xs" onClick={() => removePanel(panel.id)}>
                  🗑️ حذف اللوحة
                </button>
              </div>
            </div>

            <div>
              <label className="label">معرّف اللوحة</label>
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
                  <option value="button">أزرار (Buttons)</option>
                  <option value="select">قائمة منسدلة (Select Menu)</option>
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
              <ChannelSelect
                label="القناة التي ستُنشر فيها اللوحة"
                channels={channels}
                types={[0]}
                value={panel.channelId ?? ""}
                onChange={(v) => updatePanel(panel.id, { channelId: v })}
              />
              <div>
                <label className="label">لون الـ Embed</label>
                <input
                  type="color"
                  className="h-10 w-full rounded-lg border border-slate-300 dark:border-slate-700"
                  value={panel.color ?? "#5865F2"}
                  onChange={(e) => updatePanel(panel.id, { color: e.target.value })}
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
                  <div className="flex flex-col">
                    <button
                      type="button"
                      className="btn-secondary !px-1.5 !py-0.5 text-xs"
                      onClick={() => movePanelOption(panel.id, i, -1)}
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      className="btn-secondary mt-1 !px-1.5 !py-0.5 text-xs"
                      onClick={() => movePanelOption(panel.id, i, 1)}
                    >
                      ▼
                    </button>
                  </div>
                  <div className="!w-48">
                    <RoleSelect
                      roles={roles}
                      value={opt.roleId}
                      onChange={(v) => updatePanelOption(panel.id, i, { roleId: v })}
                    />
                  </div>
                  <input
                    className="input !w-32"
                    placeholder="الاسم الظاهر"
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

            <div className="flex items-center gap-3 border-t border-slate-200 pt-3 dark:border-slate-800">
              <button
                type="button"
                className="btn-primary"
                onClick={() => handlePublish(panel)}
              >
                {panel.messageId ? "🔄 تحديث اللوحة المنشورة" : "🚀 نشر اللوحة"}
              </button>
              {panel.messageId && (
                <span className="max-w-[300px] truncate text-xs text-slate-500 dark:text-slate-400">
                  الرسالة الحالية: {panel.messageId}
                </span>
              )}
            </div>
            {publishStatus[panel.id] && (
              <p className="whitespace-pre-line rounded-lg bg-slate-50 p-2 text-sm dark:bg-slate-800/50">
                {publishStatus[panel.id]}
              </p>
            )}
          </div>
        ))}
      </section>

      <SaveButton onSave={() => saveRolesConfig(guildId, state)} />
    </div>
  );
}
