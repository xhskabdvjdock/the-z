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
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <div className="relative h-6 w-11 shrink-0 cursor-pointer rounded-full bg-slate-700 transition-all duration-300 peer-checked:bg-gradient-to-r peer-checked:from-indigo-500 peer-checked:to-purple-600">
        <div className="absolute top-1 h-4 w-4 rounded-full bg-white transition-all duration-300 peer-checked:translate-x-5 peer-checked:shadow-lg peer-checked:shadow-indigo-500/30" />
      </div>
      {label && <span className="text-sm font-medium text-slate-300">{label}</span>}
    </label>
  );
}
