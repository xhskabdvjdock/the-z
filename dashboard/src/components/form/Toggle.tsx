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
      <div className="relative h-5 w-9 shrink-0 cursor-pointer rounded-full bg-[#2A2D37] transition-all duration-150 peer-checked:bg-[#5865F2]">
        <div className="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all duration-150 peer-checked:translate-x-4" />
      </div>
      {label && <span className="text-sm font-medium text-[#9CA3AF]">{label}</span>}
    </label>
  );
}
