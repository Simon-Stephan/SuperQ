"use client";

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800 ${className}`}
    />
  );
}

export function MessageSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex flex-col gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-16 w-full max-w-md" />
        </div>
      ))}
    </div>
  );
}

export function ThreadSkeleton() {
  return (
    <div className="flex flex-col gap-2 p-3">
      {[...Array(5)].map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}
