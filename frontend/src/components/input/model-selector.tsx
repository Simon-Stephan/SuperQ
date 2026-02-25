"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Settings2 } from "lucide-react";
import Link from "next/link";
import { useChatState, useChatDispatch } from "@/contexts/chat-context";
import { fetchActiveModels } from "@/lib/api";
import type { ActiveModel } from "@/types";

export function ModelSelector() {
  const { selectedModel } = useChatState();
  const dispatch = useChatDispatch();
  const [models, setModels] = useState<ActiveModel[]>([]);

  useEffect(() => {
    let cancelled = false;

    fetchActiveModels()
      .then((data) => {
        if (cancelled) return;
        setModels(data);
      })
      .catch(() => {
        if (!cancelled) setModels([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (models.length === 0) return;
    const isValid = models.some((m) => m.model === selectedModel);
    if (!isValid) {
      dispatch({ type: "SET_MODEL", model: models[0].model });
    }
  }, [models, selectedModel, dispatch]);

  if (models.length === 0) {
    return (
      <Link
        href="/models"
        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-indigo-600 transition-colors hover:border-indigo-300 hover:bg-indigo-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-indigo-400 dark:hover:border-indigo-600 dark:hover:bg-zinc-700"
      >
        <Settings2 size={14} />
        Activer des modèles
      </Link>
    );
  }

  return (
    <div className="inline-flex items-center gap-1">
      <div className="relative inline-flex items-center">
        <select
          value={selectedModel}
          onChange={(e) =>
            dispatch({ type: "SET_MODEL", model: e.target.value })
          }
          className="appearance-none rounded-lg border border-zinc-200 bg-white py-1.5 pl-3 pr-8 text-xs font-medium text-zinc-700 outline-none transition-colors hover:border-zinc-300 focus:border-indigo-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-600 dark:focus:border-indigo-500"
        >
          {models.map((m) => (
            <option key={m.id} value={m.model}>
              {m.label}{m.is_free ? "" : "  $"}
            </option>
          ))}
        </select>
        <ChevronDown
          size={14}
          className="pointer-events-none absolute right-2 text-zinc-400"
        />
      </div>
      <Link
        href="/models"
        title="Parcourir les modèles"
        className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
      >
        <Settings2 size={16} />
      </Link>
    </div>
  );
}
