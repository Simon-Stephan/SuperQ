"use client";

import { useState } from "react";
import { useThreads } from "@/hooks/use-threads";
import { useSidebar } from "@/hooks/use-sidebar";
import { NewThreadButton } from "./new-thread-button";
import { NewThreadModal } from "./new-thread-modal";
import { ThreadList } from "./thread-list";
import type { CreateThreadPayload } from "@/types";

export function Sidebar() {
  const { threads, activeThreadId, isLoading, hasMore, loadMore, createNewThread, selectThread, deleteThread } =
    useThreads();
  const { sidebarOpen } = useSidebar();
  const [modalOpen, setModalOpen] = useState(false);

  async function handleCreate(payload: CreateThreadPayload) {
    await createNewThread(payload);
  }

  if (!sidebarOpen) return null;

  return (
    <>
      <aside className="flex w-[280px] shrink-0 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="shrink-0 p-3">
          <NewThreadButton onClick={() => setModalOpen(true)} />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
          <ThreadList
            threads={threads}
            activeThreadId={activeThreadId}
            isLoading={isLoading}
            hasMore={hasMore}
            onSelect={selectThread}
            onDelete={deleteThread}
            onLoadMore={loadMore}
          />
        </div>
      </aside>

      <NewThreadModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreate={handleCreate}
      />
    </>
  );
}
