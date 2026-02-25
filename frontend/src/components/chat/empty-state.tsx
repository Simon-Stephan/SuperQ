"use client";

import { MessageSquarePlus } from "lucide-react";

export function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100 dark:bg-indigo-900/30">
        <MessageSquarePlus size={28} className="text-indigo-600 dark:text-indigo-400" />
      </div>
      <div>
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
          Bienvenue sur SuperQ
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Commencez une nouvelle conversation ou sélectionnez-en une existante.
        </p>
      </div>
    </div>
  );
}
