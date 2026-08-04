"use client";

import { useState } from "react";
import { saveJailConfig } from "./actions";

interface JailFormProps {
  guildId: string;
  initial: {
    enabled: boolean;
    roleId: string;
    removeRoles: string[];
    allowAdminBypass: boolean;
  };
  roles: { id: string; name: string }[];
}

export default function JailForm({ guildId, initial, roles }: JailFormProps) {
  const [state, setState] = useState(initial);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await saveJailConfig(guildId, state);
      alert("تم حفظ إعدادات السجن بنجاح");
    } catch (error) {
      alert("حدث خطأ أثناء حفظ الإعدادات");
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <section className="card flex flex-col gap-4">
        <h2 className="text-lg font-bold">الإعدادات الأساسية</h2>
        
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="jail-enabled"
            checked={state.enabled}
            onChange={(e) => setState({ ...state, enabled: e.target.checked })}
            className="w-5 h-5"
          />
          <label htmlFor="jail-enabled" className="label">
            تفعيل نظام السجن
          </label>
        </div>

        <div className="flex flex-col gap-2">
          <label className="label">رتبة السجن</label>
          <select
            className="input"
            value={state.roleId}
            onChange={(e) => setState({ ...state, roleId: e.target.value })}
          >
            <option value="">اختر رتبة السجن</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="admin-bypass"
            checked={state.allowAdminBypass}
            onChange={(e) => setState({ ...state, allowAdminBypass: e.target.checked })}
            className="w-5 h-5"
          />
          <label htmlFor="admin-bypass" className="label">
            السماح للمشرفين بتجاوز فحص السجن
          </label>
        </div>
      </section>

      <section className="card flex flex-col gap-4">
        <h2 className="text-lg font-bold">الرتب التي سيتم سحبها</h2>
        <p className="text-sm text-gray-500">
          اختر الرتب التي سيتم سحبها من العضو عند سجنه
        </p>
        
        <div className="flex flex-col gap-2">
          {roles.map((role) => (
            <div key={role.id} className="flex items-center gap-3">
              <input
                type="checkbox"
                id={`role-${role.id}`}
                checked={state.removeRoles.includes(role.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setState({ ...state, removeRoles: [...state.removeRoles, role.id] });
                  } else {
                    setState({ ...state, removeRoles: state.removeRoles.filter((r) => r !== role.id) });
                  }
                }}
                className="w-5 h-5"
              />
              <label htmlFor={`role-${role.id}`} className="label">
                {role.name}
              </label>
            </div>
          ))}
        </div>
      </section>

      <button type="submit" disabled={loading} className="btn btn-primary">
        {loading ? "جاري الحفظ..." : "حفظ الإعدادات"}
      </button>
    </form>
  );
}
