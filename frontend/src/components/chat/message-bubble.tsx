"use client";

import { User, Bot, ThumbsUp, ThumbsDown, Trash2 } from "lucide-react";
import { MarkdownRenderer } from "./markdown-renderer";
import type { Message } from "@/types";

function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const time = date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  if (isToday) return time;

  const day = date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  return `${day} ${time}`;
}

interface MessageBubbleProps {
  message: Message;
  onRate?: (messageId: string, rating: number | null) => void;
  onDelete?: (messageId: string) => void;
}

export function MessageBubble({ message, onRate, onDelete }: MessageBubbleProps) {
  const isUser = message.role === "user";

  function handleThumb(value: number) {
    if (!onRate) return;
    onRate(message.id, message.rating === value ? null : value);
  }

  return (
    <div className="group">
      <div className={`flex gap-3 px-4 py-3 ${isUser ? "justify-end" : ""}`}>
        {!isUser && (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400">
            <Bot size={16} />
          </div>
        )}
        <div
          className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
            isUser
              ? "bg-indigo-600 text-white"
              : "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap text-sm">{message.content}</p>
          ) : (
            <MarkdownRenderer content={message.content} />
          )}
        </div>
        {isUser && (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
            <User size={16} />
          </div>
        )}
      </div>

      {/* Métadonnées + actions au hover */}
      <div
        className={`flex items-center gap-2 px-4 pb-1 opacity-0 transition-opacity group-hover:opacity-100 ${
          isUser ? "justify-end pr-16" : "justify-start pl-16"
        }`}
      >
        <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
          {formatTimestamp(message.created_at)}
        </span>
        {!isUser && message.model_name && (
          <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
            · {message.model_name.split("/").pop()}
          </span>
        )}
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => handleThumb(1)}
            className={`rounded-md p-1 transition-colors ${
              message.rating === 1
                ? "text-green-500"
                : "text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
            }`}
            title="Utile"
          >
            <ThumbsUp size={14} />
          </button>
          <button
            type="button"
            onClick={() => handleThumb(-1)}
            className={`rounded-md p-1 transition-colors ${
              message.rating === -1
                ? "text-red-500"
                : "text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
            }`}
            title="Pas utile"
          >
            <ThumbsDown size={14} />
          </button>
          <button
            type="button"
            onClick={() => onDelete?.(message.id)}
            className="rounded-md p-1 text-zinc-400 transition-colors hover:text-red-500 dark:text-zinc-500 dark:hover:text-red-400"
            title="Supprimer"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
