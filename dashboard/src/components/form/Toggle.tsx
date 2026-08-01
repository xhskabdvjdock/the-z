"use client";

export default function Toggle({
  checked,
  onChange,
  label
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label?: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 select-none">
      <span
        onClick={() => onChange(!checked)}
        className={`switch ${checked ? "bg-brand" : "bg-slate-300 dark:bg-slate-700"}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
            checked ? "-translate-x-6" : "-translate-x-1"
          }`}
        />
      </span>
      {label && <span className="text-sm font-medium">{label}</span>}
    </label>
  );
}
