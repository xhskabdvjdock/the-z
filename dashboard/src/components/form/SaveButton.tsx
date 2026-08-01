"use client";

import { useState, useTransition } from "react";

export default function SaveButton({ onSave }: { onSave: () => Promise<void> | void }) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  const handleClick = () => {
    startTransition(async () => {
      try {
        await onSave();
        setStatus("success");
      } catch (err) {
        console.error(err);
        setStatus("error");
      } finally {
        setTimeout(() => setStatus("idle"), 2500);
      }
    });
  };

  return (
    <div className="flex items-center gap-3">
      <button onClick={handleClick} disabled={isPending} className="btn-primary">
        {isPending ? "جاري الحفظ..." : "حفظ التغييرات"}
      </button>
      {status === "success" && <span className="text-sm text-green-600 dark:text-green-400">تم الحفظ بنجاح</span>}
      {status === "error" && <span className="text-sm text-red-600 dark:text-red-400">حدث خطأ أثناء الحفظ</span>}
    </div>
  );
}
