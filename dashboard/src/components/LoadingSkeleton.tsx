/**
 * LoadingSkeleton — مكوّن شيمر قابل للتخصيص يُستخدم كـ placeholder أثناء تحميل البيانات.
 *
 * الاستخدام:
 *   <LoadingSkeleton />                          — صف واحد بعرض كامل وارتفاع افتراضي
 *   <LoadingSkeleton lines={3} />                — ثلاثة أسطر
 *   <LoadingSkeleton variant="card" />           — بطاقة كاملة
 *   <LoadingSkeleton variant="avatar" />         — دائرة أفاتار
 *   <LoadingSkeleton className="h-10 w-32" />    — حجم مخصص
 */

interface LoadingSkeletonProps {
  /** عدد الأسطر المتكررة (variant="line" فقط) */
  lines?: number;
  /** شكل الـ skeleton */
  variant?: "line" | "card" | "avatar" | "badge";
  className?: string;
}

function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`rounded bg-[#1e2130] ${className}`} />;
}

export default function LoadingSkeleton({
  lines = 1,
  variant = "line",
  className = ""
}: LoadingSkeletonProps) {
  if (variant === "card") {
    return (
      <div className={`card flex flex-col gap-4 ${className}`}>
        <SkeletonBlock className="h-6 w-40" />
        <SkeletonBlock className="h-4 w-full" />
        <SkeletonBlock className="h-4 w-5/6" />
        <SkeletonBlock className="h-4 w-4/6" />
        <div className="flex gap-3 pt-2">
          <SkeletonBlock className="h-9 w-24 rounded-lg" />
          <SkeletonBlock className="h-9 w-24 rounded-lg" />
        </div>
      </div>
    );
  }

  if (variant === "avatar") {
    return <SkeletonBlock className={`rounded-full ${className || "h-12 w-12"}`} />;
  }

  if (variant === "badge") {
    return <SkeletonBlock className={`rounded-full ${className || "h-6 w-16"}`} />;
  }

  // variant === "line" (default)
  if (lines === 1) {
    return <SkeletonBlock className={`h-4 w-full ${className}`} />;
  }

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBlock
          key={i}
          className={`h-4 ${i === lines - 1 ? "w-3/4" : "w-full"}`}
        />
      ))}
    </div>
  );
}

/** Skeleton جاهز لصفحة الإعدادات الكاملة */
export function PageLoadingSkeleton() {
  return (
    <div className="flex flex-col gap-6 pb-4">
      <LoadingSkeleton variant="card" />
      <LoadingSkeleton variant="card" />
      <LoadingSkeleton variant="card" />
    </div>
  );
}
