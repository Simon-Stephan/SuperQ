"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Spinner } from "@/components/ui/spinner";
import { useChatDispatch } from "@/contexts/chat-context";
import * as api from "@/lib/api";
import type { Thread } from "@/types";

interface ThreadSettingsModalProps {
  open: boolean;
  onClose: () => void;
  thread: Thread;
}

export function ThreadSettingsModal({
  open,
  onClose,
  thread,
}: ThreadSettingsModalProps) {
  const dispatch = useChatDispatch();
  const [title, setTitle] = useState(thread.title);
  const [systemPrompt, setSystemPrompt] = useState(thread.system_prompt);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    setTitle(thread.title);
    setSystemPrompt(thread.system_prompt);
    setSaveError(null);
  }, [thread, open]);

  const hasChanges =
    title.trim() !== thread.title || systemPrompt.trim() !== thread.system_prompt;

  async function handleSave() {
    if (!hasChanges || isSaving) return;

    setIsSaving(true);
    setSaveError(null);
    try {
      const updated = await api.updateThread(thread.id, {
        title: title.trim(),
        system_prompt: systemPrompt.trim(),
      });
      dispatch({ type: "UPDATE_THREAD", thread: updated });
      onClose();
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Erreur lors de la sauvegarde",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Paramètres de la conversation">
      <div className="flex flex-col gap-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Titre
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none transition-colors focus:border-indigo-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:focus:border-indigo-500"
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
            className="w-full resize-none rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none transition-colors focus:border-indigo-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Identifiant
          </label>
          <p className="rounded-lg bg-zinc-50 px-3 py-2 font-mono text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
            {thread.id}
          </p>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Créée le
          </label>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {new Date(thread.created_at).toLocaleString("fr-FR")}
          </p>
        </div>

        {thread.current_summary && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Résumé courant
            </label>
            <p className="rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
              {thread.current_summary}
            </p>
          </div>
        )}

        {saveError && (
          <p className="text-sm text-red-600 dark:text-red-400">{saveError}</p>
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || isSaving || !title.trim() || !systemPrompt.trim()}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
          >
            {isSaving && <Spinner className="text-white" />}
            Enregistrer
          </button>
        </div>
      </div>
    </Modal>
  );
}
