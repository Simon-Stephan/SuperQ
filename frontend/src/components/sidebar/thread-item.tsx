"use client";

import { useState } from "react";
import { MessageSquare, Trash2 } from "lucide-react";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import type { Thread } from "@/types";

interface ThreadItemProps {
  thread: Thread;
  active: boolean;
  onClick: () => void;
  onDelete: (threadId: string) => Promise<void>;
}

export function ThreadItem({ thread, active, onClick, onDelete }: ThreadItemProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    setIsDeleting(true);
    try {
      await onDelete(thread.id);
      setConfirmOpen(false);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <div
        className={`group flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
          active
            ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
            : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
        }`}
      >
        <button onClick={onClick} className="flex min-w-0 flex-1 items-center gap-2">
          <MessageSquare size={14} className="shrink-0" />
          <span className="truncate">{thread.title || "Sans titre"}</span>
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setConfirmOpen(true);
          }}
          className="shrink-0 rounded p-1 text-zinc-400 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100 dark:text-zinc-500 dark:hover:text-red-400"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <ConfirmModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Supprimer la conversation"
        message="Voulez-vous supprimer cette conversation et tous ses messages ? Cette action est irréversible."
        confirmLabel="Supprimer"
        isLoading={isDeleting}
      />
    </>
  );
}
