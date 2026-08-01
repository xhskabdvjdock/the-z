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
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ${
          checked ? "bg-gray-600" : "bg-gray-700"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </span>
      {label && <span className="text-sm font-medium text-gray-300">{label}</span>}
    </label>
  );
}
