"use client";

export interface MultiSelectOption {
  id: string;
  label: string;
}

export default function MultiSelect({
  options,
  values,
  onChange,
  label,
  emptyText = "لا توجد عناصر"
}: {
  options: MultiSelectOption[];
  values: string[];
  onChange: (values: string[]) => void;
  label?: string;
  emptyText?: string;
}) {
  const toggle = (id: string) => {
    if (values.includes(id)) onChange(values.filter((v) => v !== id));
    else onChange([...values, id]);
  };

  return (
    <div>
      {label && <label className="label">{label}</label>}
      <div className="flex max-h-44 flex-col gap-1 overflow-y-auto rounded-lg border border-slate-300 p-2 dark:border-slate-700">
        {options.length === 0 && <p className="p-2 text-sm text-slate-400">{emptyText}</p>}
        {options.map((opt) => (
          <label
            key={opt.id}
            className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <input
              type="checkbox"
              checked={values.includes(opt.id)}
              onChange={() => toggle(opt.id)}
              className="h-4 w-4 accent-brand"
            />
            {opt.label}
          </label>
        ))}
      </div>
    </div>
  );
}
