"use client";

import { AVAILABLE_VARIABLES } from "@thez/shared/client";

export default function VariablesHint() {
  return (
    <details className="rounded-lg border border-dashed border-slate-300 p-3 text-xs dark:border-slate-700">
      <summary className="cursor-pointer select-none font-medium text-brand">
        📎 المتغيرات الديناميكية المتاحة
      </summary>
      <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {AVAILABLE_VARIABLES.map((v) => (
          <div key={v.key} className="rounded bg-slate-100 px-2 py-1 dark:bg-slate-800">
            <code className="font-bold text-brand">{v.key}</code>
            <span className="block text-slate-500 dark:text-slate-400">{v.description}</span>
          </div>
        ))}
      </div>
    </details>
  );
}
