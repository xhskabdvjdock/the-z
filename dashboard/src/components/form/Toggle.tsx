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
      <div className="relative h-6 w-11 shrink-0 cursor-pointer rounded-full bg-gray-700 transition-colors duration-200 peer-checked:bg-gray-600">
        <div className="absolute top-1 h-4 w-4 rounded-full bg-white transition-all duration-200 peer-checked:translate-x-5" />
      </div>
      {label && <span className="text-sm font-medium text-gray-300">{label}</span>}
    </label>
  );
}
