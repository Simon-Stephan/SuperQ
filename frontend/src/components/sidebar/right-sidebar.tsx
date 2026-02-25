"use client";

import { useMemo } from "react";
import { X, BookOpen, MessageSquare, FileText, Tag, Mic, Compass } from "lucide-react";
import { useChatState, useChatDispatch } from "@/contexts/chat-context";
import { MarkdownRenderer } from "@/components/chat/markdown-renderer";
import type { Thread } from "@/types";

interface StructuredSummary {
  context: string;
  keywords: string[];
  tone: string;
  direction: string;
}

function tryParseSummary(raw: string): StructuredSummary | null {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.context === "string") {
      return {
        context: parsed.context || "",
        keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
        tone: parsed.tone || "",
        direction: parsed.direction || "",
      };
    }
  } catch {
    // pas du JSON valide
  }
  return null;
}

function StructuredSummaryView({ summary }: { summary: StructuredSummary }) {
  return (
    <div className="flex flex-col gap-4">
      {summary.context && (
        <div>
          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
            <FileText size={12} />
            Contexte
          </div>
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            {summary.context}
          </p>
        </div>
      )}

      {summary.keywords.length > 0 && (
        <div>
          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
            <Tag size={12} />
            Mots-clés
          </div>
          <div className="flex flex-wrap gap-1.5">
            {summary.keywords.map((kw, i) => (
              <span
                key={i}
                className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400"
              >
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}

      {summary.tone && (
        <div>
          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
            <Mic size={12} />
            Ton
          </div>
          <p className="text-sm text-zinc-700 dark:text-zinc-300 capitalize">
            {summary.tone}
          </p>
        </div>
      )}

      {summary.direction && (
        <div>
          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
            <Compass size={12} />
            Direction
          </div>
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            {summary.direction}
          </p>
        </div>
      )}
    </div>
  );
}

function ConversationDigest({ messages }: { messages: { role: string; content: string }[] }) {
  if (messages.length === 0) {
    return (
      <p className="text-sm text-zinc-400 italic">
        Aucun message dans cette conversation.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {messages.map((msg, i) => (
        <div key={i} className="flex gap-2">
          <div
            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
              msg.role === "user"
                ? "bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"
                : "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400"
            }`}
          >
            {msg.role === "user" ? "U" : "A"}
          </div>
          <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            {msg.content.length > 200
              ? msg.content.slice(0, 200) + "..."
              : msg.content}
          </p>
        </div>
      ))}
    </div>
  );
}

export function RightSidebar() {
  const { threads, activeThreadId, messages, rightSidebarOpen } = useChatState();
  const dispatch = useChatDispatch();

  const activeThread: Thread | undefined = threads.find(
    (t) => t.id === activeThreadId,
  );

  const hasSummary = activeThread?.current_summary && activeThread.current_summary.trim().length > 0;

  const structuredSummary = useMemo(() => {
    if (!hasSummary) return null;
    return tryParseSummary(activeThread!.current_summary!);
  }, [hasSummary, activeThread?.current_summary]);

  return (
    <aside
      className={`fixed inset-y-0 right-0 z-50 flex w-[320px] shrink-0 flex-col border-l border-zinc-200 bg-white transition-transform duration-200 dark:border-zinc-800 dark:bg-zinc-900 md:relative md:z-auto md:translate-x-0 ${
        rightSidebarOpen ? "translate-x-0" : "translate-x-full md:hidden"
      }`}
    >
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-200 px-4 dark:border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Contexte
        </h2>
        <button
          onClick={() => dispatch({ type: "SET_RIGHT_SIDEBAR_OPEN", open: false })}
          className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
        >
          <X size={18} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {!activeThread ? (
          <p className="text-sm text-zinc-400 italic">
            Sélectionnez une conversation.
          </p>
        ) : hasSummary ? (
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-zinc-400">
              <BookOpen size={14} />
              Résumé
            </div>
            <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800">
              {structuredSummary ? (
                <StructuredSummaryView summary={structuredSummary} />
              ) : (
                <MarkdownRenderer content={activeThread.current_summary!} />
              )}
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-zinc-400">
              <MessageSquare size={14} />
              Historique
            </div>
            <ConversationDigest messages={messages} />
          </div>
        )}
      </div>
    </aside>
  );
}
