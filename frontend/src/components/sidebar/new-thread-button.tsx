"use client";

import { Plus } from "lucide-react";

interface NewThreadButtonProps {
  onClick: () => void;
}

export function NewThreadButton({ onClick }: NewThreadButtonProps) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
    >
      <Plus size={16} />
      Nouvelle conversation
    </button>
  );
}
