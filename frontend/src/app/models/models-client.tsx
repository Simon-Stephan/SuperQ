"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { fetchActiveModels, activateModel, deactivateModel } from "@/lib/api";
import type { ActiveModel } from "@/types";

export interface OpenRouterModel {
  id: string;
  name: string;
  description: string;
  context_length: number;
  architecture: {
    modality: string;
    input_modalities: string[];
    output_modalities: string[];
    tokenizer: string;
  };
  pricing: {
    prompt: string;
    completion: string;
  };
  top_provider: {
    context_length: number;
    max_completion_tokens: number;
    is_moderated: boolean;
  };
}

type Filter = "all" | "free" | "paid";

function isFree(model: OpenRouterModel): boolean {
  return (
    parseFloat(model.pricing.prompt) === 0 &&
    parseFloat(model.pricing.completion) === 0
  );
}

function formatPrice(pricePerToken: string): string {
  const price = parseFloat(pricePerToken);
  if (price === 0) return "Gratuit";
  const perMillion = price * 1_000_000;
  if (perMillion < 0.01) return "<$0.01";
  return `$${perMillion.toFixed(2)}`;
}

function formatContextLength(length: number): string {
  if (length >= 1_000_000) return `${(length / 1_000_000).toFixed(1)}M`;
  return `${Math.round(length / 1_000)}K`;
}

interface ModelsClientProps {
  models: OpenRouterModel[];
}

export function ModelsClient({ models }: ModelsClientProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeBySlug, setActiveBySlug] = useState<Map<string, ActiveModel>>(new Map());
  const [loadingSlug, setLoadingSlug] = useState<string | null>(null);

  const refreshActiveModels = useCallback(async () => {
    try {
      const activeModels = await fetchActiveModels();
      const map = new Map<string, ActiveModel>();
      for (const m of activeModels) {
        map.set(m.model, m);
      }
      setActiveBySlug(map);
    } catch (e) {
      console.error("Failed to fetch active models:", e);
    }
  }, []);

  useEffect(() => {
    refreshActiveModels();
  }, [refreshActiveModels]);

  async function handleToggleActive(model: OpenRouterModel) {
    const active = activeBySlug.get(model.id);
    setLoadingSlug(model.id);
    try {
      if (active) {
        await deactivateModel(active.id);
      } else {
        await activateModel({
          label: model.name,
          description: model.description || null,
          model: model.id,
          is_free: isFree(model),
        });
      }
      await refreshActiveModels();
    } catch (e) {
      console.error("Failed to toggle model:", e);
    } finally {
      setLoadingSlug(null);
    }
  }

  const filtered = models.filter((m) => {
    const q = search.toLowerCase();
    const matchesSearch =
      m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q);
    const free = isFree(m);
    if (filter === "free") return matchesSearch && free;
    if (filter === "paid") return matchesSearch && !free;
    return matchesSearch;
  });

  const freeCount = models.filter(isFree).length;
  const paidCount = models.length - freeCount;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-zinc-500 transition-colors hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            <ArrowLeft size={16} />
            SuperQ
          </Link>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Modèles disponibles
          </h1>
          <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
            {filtered.length}
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un modèle..."
              className="w-full rounded-lg border border-zinc-200 bg-white py-2 pl-10 pr-4 text-sm outline-none transition-colors focus:border-indigo-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:focus:border-indigo-500"
            />
          </div>
          <div className="flex gap-1 rounded-lg border border-zinc-200 bg-white p-1 dark:border-zinc-700 dark:bg-zinc-800">
            {(
              [
                ["all", `Tous (${models.length})`],
                ["free", `Gratuits (${freeCount})`],
                ["paid", `Payants (${paidCount})`],
              ] as [Filter, string][]
            ).map(([value, label]) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  filter === value
                    ? "bg-indigo-600 text-white"
                    : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-sm text-zinc-500">Aucun modèle trouvé.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((model) => {
              const free = isFree(model);
              const expanded = expandedId === model.id;
              const active = activeBySlug.get(model.id);
              const isLoading = loadingSlug === model.id;

              return (
                <div
                  key={model.id}
                  onClick={() => setExpandedId(expanded ? null : model.id)}
                  className={`cursor-pointer rounded-xl border p-4 transition-all hover:shadow-sm ${
                    active
                      ? "border-indigo-500 bg-indigo-50 hover:border-indigo-600 dark:bg-indigo-950/30 dark:hover:border-indigo-400"
                      : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
                  }`}
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {model.name}
                    </h3>
                    {free ? (
                      <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400">
                        GRATUIT
                      </span>
                    ) : (
                      <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/50 dark:text-amber-400">
                        PAYANT
                      </span>
                    )}
                  </div>

                  <p className="mb-3 font-mono text-[11px] text-zinc-400 dark:text-zinc-500">
                    {model.id}
                  </p>

                  <p
                    className={`mb-3 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400 ${
                      expanded ? "" : "line-clamp-2"
                    }`}
                  >
                    {model.description || "Pas de description disponible."}
                  </p>

                  <div className="flex flex-wrap gap-1.5">
                    <span className="rounded-md bg-zinc-100 px-2 py-1 text-[11px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                      {formatContextLength(model.context_length)} ctx
                    </span>
                    <span className="rounded-md bg-zinc-100 px-2 py-1 text-[11px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                      {model.architecture.modality}
                    </span>
                    {!free && (
                      <>
                        <span className="rounded-md bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                          Input {formatPrice(model.pricing.prompt)}/M
                        </span>
                        <span className="rounded-md bg-blue-50 px-2 py-1 text-[11px] font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                          Output {formatPrice(model.pricing.completion)}/M
                        </span>
                      </>
                    )}
                    {model.top_provider.max_completion_tokens > 0 && (
                      <span className="rounded-md bg-zinc-100 px-2 py-1 text-[11px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                        Max {formatContextLength(model.top_provider.max_completion_tokens)} out
                      </span>
                    )}
                  </div>

                  <button
                    disabled={isLoading}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleActive(model);
                    }}
                    className={`mt-3 w-full rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                      active
                        ? "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
                        : "bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50"
                    }`}
                  >
                    {isLoading ? "..." : active ? "Désactiver" : "Activer"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
