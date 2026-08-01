"use client";

import { useState } from "react";
import { IGuildConfig, ITicketCategory } from "@thez/shared/client";
import { DiscordChannel, DiscordRole } from "@/lib/discord";
import Toggle from "@/components/form/Toggle";
import ChannelSelect from "@/components/form/ChannelSelect";
import MultiSelect from "@/components/form/MultiSelect";
import CustomMessageEditor from "@/components/form/CustomMessageEditor";
import VariablesHint from "@/components/form/VariablesHint";
import SaveButton from "@/components/form/SaveButton";
import { saveTicketsConfig } from "./actions";

function createCategory(): ITicketCategory {
  return {
    key: `cat_${Date.now()}`,
    name: "تصنيف جديد",
    emoji: "🎫",
    categoryId: "",
    staffRoleIds: [],
    logChannelId: "",
    welcomeMessage: { enabled: true, content: "" },
    questions: [],
    ticketNameFormat: "ticket-{count}",
    panelTitle: "نظام التذاكر",
    panelDescription: "اختر التصنيف المناسب لفتح تذكرة",
    panelEmbed: { enabled: true, content: "", embed: { enabled: true, title: "نظام التذاكر", description: "اختر التصنيف المناسب لفتح تذكرة" } },
    panelButtonStyle: "Primary",
    closeButtonLabel: "إغلاق",
    claimButtonLabel: "استلام",
    openMessage: { enabled: true, content: "تم إنشاء تذكرتك بنجاح" },
    closeMessage: { enabled: true, content: "تم إغلاق التذكرة" },
    claimMessage: { enabled: true, content: "تم استلام التذكرة" }
  };
}

export default function TicketsForm({
  guildId,
  initial,
  channels,
  roles
}: {
  guildId: string;
  initial: IGuildConfig["tickets"];
  channels: DiscordChannel[];
  roles: DiscordRole[];
}) {
  const [state, setState] = useState<IGuildConfig["tickets"]>(initial);

  const roleOptions = roles.map((r) => ({ id: r.id, label: `@${r.name}` }));

  const updateCategory = (index: number, patch: Partial<ITicketCategory>) => {
    const next = [...state.categories];
    next[index] = { ...next[index], ...patch };
    setState({ ...state, categories: next });
  };

  const removeCategory = (index: number) => {
    setState({ ...state, categories: state.categories.filter((_, i) => i !== index) });
  };

  const addCategory = () => {
    setState({ ...state, categories: [...state.categories, createCategory()] });
  };

  const addQuestion = (catIndex: number) => {
    const cat = state.categories[catIndex];
    updateCategory(catIndex, { questions: [...cat.questions, ""] });
  };

  const updateQuestion = (catIndex: number, qIndex: number, value: string) => {
    const cat = state.categories[catIndex];
    const next = [...cat.questions];
    next[qIndex] = value;
    updateCategory(catIndex, { questions: next });
  };

  const removeQuestion = (catIndex: number, qIndex: number) => {
    const cat = state.categories[catIndex];
    updateCategory(catIndex, { questions: cat.questions.filter((_, i) => i !== qIndex) });
  };

  return (
    <div className="flex flex-col gap-6">
      <VariablesHint />

      <section className="card flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">🎫 إعدادات نظام التذاكر</h2>
          <Toggle
            checked={state.enabled}
            onChange={(v) => setState({ ...state, enabled: v })}
            label={state.enabled ? "مفعّل" : "معطّل"}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label">شكل لوحة فتح التذكرة</label>
            <select
              className="input"
              value={state.panelStyle}
              onChange={(e) =>
                setState({ ...state, panelStyle: e.target.value as "buttons" | "select" })
              }
            >
              <option value="buttons">أزرار</option>
              <option value="select">قائمة اختيار</option>
            </select>
          </div>

          <ChannelSelect
            label="روم حفظ نسخة المحادثة (Transcript)"
            channels={channels}
            types={[0, 5]}
            value={state.transcriptChannelId ?? ""}
            onChange={(v) => setState({ ...state, transcriptChannelId: v })}
          />

          <div className="flex items-end">
            <Toggle
              checked={state.saveTranscriptAsHtml}
              onChange={(v) => setState({ ...state, saveTranscriptAsHtml: v })}
              label="حفظ النسخة بصيغة HTML"
            />
          </div>

          <div>
            <label className="label">الحد الأقصى لعدد التذاكر المفتوحة لكل عضو</label>
            <input
              type="number"
              min={1}
              className="input"
              value={state.maxOpenPerUser}
              onChange={(e) => setState({ ...state, maxOpenPerUser: Number(e.target.value) })}
            />
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">📂 تصنيفات التذاكر</h2>
          <button type="button" className="btn-secondary" onClick={addCategory}>
            + إضافة تصنيف
          </button>
        </div>

        {state.categories.length === 0 && (
          <p className="card text-sm text-slate-500 dark:text-slate-400">
            لا توجد تصنيفات بعد. أضف تصنيفاً لبدء استخدام نظام التذاكر.
          </p>
        )}

        {state.categories.map((cat, index) => (
          <div key={cat.key} className="card flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold">{cat.emoji} {cat.name || "تصنيف بدون اسم"}</h3>
              <button
                type="button"
                className="btn-danger !px-3 !py-1.5 text-xs"
                onClick={() => removeCategory(index)}
              >
                حذف التصنيف
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="label">اسم التصنيف</label>
                <input
                  className="input"
                  value={cat.name}
                  onChange={(e) => updateCategory(index, { name: e.target.value })}
                />
              </div>
              <div>
                <label className="label">الإيموجي</label>
                <input
                  className="input"
                  value={cat.emoji ?? ""}
                  onChange={(e) => updateCategory(index, { emoji: e.target.value })}
                />
              </div>

              <ChannelSelect
                label="تصنيف ديسكورد (Category) لإنشاء التذاكر بداخله"
                channels={channels}
                types={[4]}
                value={cat.categoryId ?? ""}
                onChange={(v) => updateCategory(index, { categoryId: v })}
              />

              <ChannelSelect
                label="روم سجل هذا التصنيف"
                channels={channels}
                types={[0, 5]}
                value={cat.logChannelId ?? ""}
                onChange={(v) => updateCategory(index, { logChannelId: v })}
              />

              <MultiSelect
                label="رتب فريق الدعم المسؤولة عن هذا التصنيف"
                options={roleOptions}
                values={cat.staffRoleIds}
                onChange={(v) => updateCategory(index, { staffRoleIds: v })}
              />

              <div>
                <label className="label">صيغة اسم روم التذكرة</label>
                <input
                  className="input"
                  placeholder="ticket-{count}"
                  value={cat.ticketNameFormat ?? ""}
                  onChange={(e) => updateCategory(index, { ticketNameFormat: e.target.value })}
                />
              </div>

              <div>
                <label className="label">عنوان لوحة التذاكر</label>
                <input
                  className="input"
                  placeholder="نظام التذاكر"
                  value={cat.panelTitle ?? ""}
                  onChange={(e) => updateCategory(index, { panelTitle: e.target.value })}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="label">وصف لوحة التذاكر</label>
                <input
                  className="input"
                  placeholder="اختر التصنيف المناسب لفتح تذكرة"
                  value={cat.panelDescription ?? ""}
                  onChange={(e) => updateCategory(index, { panelDescription: e.target.value })}
                />
              </div>

              <div>
                <label className="label">نص زر الإغلاق</label>
                <input
                  className="input"
                  placeholder="إغلاق"
                  value={cat.closeButtonLabel ?? ""}
                  onChange={(e) => updateCategory(index, { closeButtonLabel: e.target.value })}
                />
              </div>

              <div>
                <label className="label">نص زر الاستلام</label>
                <input
                  className="input"
                  placeholder="استلام"
                  value={cat.claimButtonLabel ?? ""}
                  onChange={(e) => updateCategory(index, { claimButtonLabel: e.target.value })}
                />
              </div>

              <div>
                <label className="label">نمط أزرار اللوحة</label>
                <select
                  className="input"
                  value={cat.panelButtonStyle ?? "Primary"}
                  onChange={(e) => updateCategory(index, { panelButtonStyle: e.target.value as "Primary" | "Secondary" | "Success" | "Danger" })}
                >
                  <option value="Primary">أزرق (Primary)</option>
                  <option value="Secondary">رمادي (Secondary)</option>
                  <option value="Success">أخضر (Success)</option>
                  <option value="Danger">أحمر (Danger)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="label">رسالة لوحة التذاكر</label>
              <CustomMessageEditor
                value={cat.panelEmbed ?? { enabled: true, content: "", embed: { enabled: true, title: "نظام التذاكر", description: "اختر التصنيف المناسب لفتح تذكرة" } }}
                onChange={(msg) => updateCategory(index, { panelEmbed: msg })}
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="label !mb-0">الأسئلة التي تُطرح عند فتح التذكرة</label>
                <button
                  type="button"
                  className="btn-secondary !px-2.5 !py-1 text-xs"
                  onClick={() => addQuestion(index)}
                >
                  + إضافة سؤال
                </button>
              </div>
              <div className="flex flex-col gap-2">
                {cat.questions.length === 0 && (
                  <p className="text-sm text-slate-400">لا توجد أسئلة مضافة.</p>
                )}
                {cat.questions.map((q, qIndex) => (
                  <div key={qIndex} className="flex items-center gap-2">
                    <input
                      className="input flex-1"
                      placeholder={`السؤال ${qIndex + 1}`}
                      value={q}
                      onChange={(e) => updateQuestion(index, qIndex, e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn-danger !px-2 !py-1 text-xs"
                      onClick={() => removeQuestion(index, qIndex)}
                    >
                      حذف
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="label">رسالة الترحيب داخل روم التذكرة</label>
              <CustomMessageEditor
                value={cat.welcomeMessage ?? { enabled: true, content: "" }}
                onChange={(msg) => updateCategory(index, { welcomeMessage: msg })}
              />
            </div>

            <div>
              <label className="label">رسالة فتح التذكرة</label>
              <CustomMessageEditor
                value={cat.openMessage ?? { enabled: true, content: "تم إنشاء تذكرتك بنجاح" }}
                onChange={(msg) => updateCategory(index, { openMessage: msg })}
              />
            </div>

            <div>
              <label className="label">رسالة إغلاق التذكرة</label>
              <CustomMessageEditor
                value={cat.closeMessage ?? { enabled: true, content: "تم إغلاق التذكرة" }}
                onChange={(msg) => updateCategory(index, { closeMessage: msg })}
              />
            </div>

            <div>
              <label className="label">رسالة استلام التذكرة</label>
              <CustomMessageEditor
                value={cat.claimMessage ?? { enabled: true, content: "تم استلام التذكرة" }}
                onChange={(msg) => updateCategory(index, { claimMessage: msg })}
              />
            </div>
          </div>
        ))}
      </section>

      <SaveButton onSave={() => saveTicketsConfig(guildId, state)} />
    </div>
  );
}
