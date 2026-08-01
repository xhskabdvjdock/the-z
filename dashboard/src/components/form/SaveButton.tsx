"use client";

import { useState } from "react";

export default function SaveButton({ onSave }: { onSave: () => Promise<void> | void }) {
  const [isPending, setIsPending] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  const handleClick = async () => {
    setIsPending(true);
    try {
      console.log("SaveButton: Calling onSave function");
      await onSave();
      console.log("SaveButton: onSave completed successfully");
      setStatus("success");
    } catch (err) {
      console.error("SaveButton: Error during save:", err);
      setStatus("error");
    } finally {
      setIsPending(false);
      setTimeout(() => setStatus("idle"), 2500);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <button onClick={handleClick} disabled={isPending} className="btn-primary">
        {isPending ? "جاري الحفظ..." : "حفظ التغييرات"}
      </button>
      {status === "success" && (
        <span className="text-sm font-medium text-[#10B981]">تم الحفظ بنجاح</span>
      )}
      {status === "error" && (
        <span className="text-sm font-medium text-[#EF4444]">حدث خطأ أثناء الحفظ</span>
      )}
    </div>
  );
}
