"use client";

import { useState, useRef, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Spinner } from "@/components/ui/spinner";
import type { CreateThreadPayload } from "@/types";

interface NewThreadModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (payload: CreateThreadPayload) => Promise<unknown>;
}

export function NewThreadModal({ open, onClose, onCreate }: NewThreadModalProps) {
  const [title, setTitle] = useState("");
  const [systemPrompt, setSystemPrompt] = useState(
    "Tu es un assistant IA utile, précis et concis."
  );
  const [isCreating, setIsCreating] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => titleRef.current?.focus(), 0);
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !systemPrompt.trim() || isCreating) return;

    setIsCreating(true);
    try {
      await onCreate({ title: title.trim(), system_prompt: systemPrompt.trim() });
      setTitle("");
      setSystemPrompt("Tu es un assistant IA utile, précis et concis.");
      onClose();
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nouvelle conversation">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Titre
          </label>
          <input
            ref={titleRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex : Aide rédaction, Debug Python..."
            className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none transition-colors placeholder:text-zinc-400 focus:border-indigo-500 dark:border-zinc-700 dark:bg-zinc-800 dark:focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            System prompt
          </label>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={4}
            placeholder="Instructions pour l'assistant..."
            className="w-full resize-none rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none transition-colors placeholder:text-zinc-400 focus:border-indigo-500 dark:border-zinc-700 dark:bg-zinc-800 dark:focus:border-indigo-500"
          />
          <p className="mt-1 text-xs text-zinc-400">
            Définissez le comportement et le contexte de l&apos;assistant pour cette conversation.
          </p>
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isCreating}
            className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={!title.trim() || !systemPrompt.trim() || isCreating}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
          >
            {isCreating && <Spinner className="text-white" />}
            Créer
          </button>
        </div>
      </form>
    </Modal>
  );
}
