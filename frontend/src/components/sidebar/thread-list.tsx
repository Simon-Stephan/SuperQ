"use client";

import { useEffect, useRef } from "react";
import { ThreadItem } from "./thread-item";
import { ThreadSkeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import type { Thread } from "@/types";

interface ThreadListProps {
  threads: Thread[];
  activeThreadId: string | null;
  isLoading: boolean;
  hasMore: boolean;
  onSelect: (threadId: string) => void;
  onDelete: (threadId: string) => Promise<void>;
  onLoadMore: () => void;
}

export function ThreadList({
  threads,
  activeThreadId,
  isLoading,
  hasMore,
  onSelect,
  onDelete,
  onLoadMore,
}: ThreadListProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore();
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [onLoadMore]);

  if (isLoading) {
    return <ThreadSkeleton />;
  }

  if (threads.length === 0) {
    return (
      <p className="px-3 py-4 text-center text-xs text-zinc-400">
        Aucune conversation
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      {threads.map((thread) => (
        <ThreadItem
          key={thread.id}
          thread={thread}
          active={thread.id === activeThreadId}
          onClick={() => onSelect(thread.id)}
          onDelete={onDelete}
        />
      ))}

      {hasMore ? (
        <div ref={sentinelRef} className="flex justify-center py-3">
          <Spinner />
        </div>
      ) : (
        <p className="py-3 text-center text-xs text-zinc-400">
          Pas d&apos;autre conversation à afficher
        </p>
      )}
    </div>
  );
}
