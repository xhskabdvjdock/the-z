"use client";

export function Skeleton({ className = "", width, height }: { className?: string; width?: string; height?: string }) {
  const style: React.CSSProperties = {};
  if (width) style.width = width;
  if (height) style.height = height;
  return <div className={`animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700 ${className}`} style={style} />;
}

export function CardSkeleton() {
  return (
    <div className="card flex flex-col gap-3">
      <Skeleton className="h-6 w-1/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <div className="flex gap-2">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-24" />
      </div>
    </div>
  );
}

export function GuildCardSkeleton() {
  return (
    <div className="card flex items-center gap-4">
      <Skeleton className="h-12 w-12 rounded-full" />
      <div className="flex flex-1 flex-col gap-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Skeleton className="mb-2 h-8 w-48" />
      <Skeleton className="mb-8 h-4 w-96" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <GuildCardSkeleton />
        <GuildCardSkeleton />
        <GuildCardSkeleton />
        <GuildCardSkeleton />
        <GuildCardSkeleton />
        <GuildCardSkeleton />
      </div>
    </div>
  );
}