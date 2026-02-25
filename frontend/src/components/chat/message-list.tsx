"use client";

import { useEffect, useRef, useLayoutEffect, useCallback } from "react";
import { MessageBubble } from "./message-bubble";
import { MessageSkeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { rateMessage, deleteMessage } from "@/lib/api";
import { useChatState, useChatDispatch } from "@/contexts/chat-context";
import type { Message } from "@/types";

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  isSending: boolean;
  onLoadMore: () => void;
  hasMore: boolean;
  isLoadingMore: boolean;
}

export function MessageList({
  messages,
  isLoading,
  isSending,
  onLoadMore,
  hasMore,
  isLoadingMore,
}: MessageListProps) {
  const { activeThreadId } = useChatState();
  const dispatch = useChatDispatch();
  const containerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const lastMsgRef = useRef<HTMLDivElement>(null);
  const sendingRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(messages.length);
  const prevScrollHeightRef = useRef<number>(0);
  const isPrependingRef = useRef(false);

  // Détecte si c'est un prepend (messages ajoutés au début) vs append (nouveau message)
  useEffect(() => {
    const prevCount = prevCountRef.current;
    const newCount = messages.length;

    if (newCount > prevCount && prevCount > 0) {
      // Vérifier si le dernier message a changé (= append) ou non (= prepend)
      // Si c'est un prepend, on ne scroll pas vers le bas
      const isAppend = newCount > prevCount && prevCount > 0;
      // On ne scroll vers le bas que pour les appends (nouveaux messages envoyés)
      if (isAppend && !isPrependingRef.current) {
        lastMsgRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }

    prevCountRef.current = newCount;
  }, [messages]);

  // Scroll preservation pour le prepend
  useLayoutEffect(() => {
    if (isPrependingRef.current && containerRef.current) {
      const newScrollHeight = containerRef.current.scrollHeight;
      const oldScrollHeight = prevScrollHeightRef.current;
      containerRef.current.scrollTop = newScrollHeight - oldScrollHeight;
      isPrependingRef.current = false;
    }
  }, [messages]);

  // Auto-scroll vers le bas quand on est en train d'envoyer
  useEffect(() => {
    if (isSending) {
      sendingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [isSending]);

  // Scroll initial vers le bas quand les messages sont chargés pour la première fois
  useEffect(() => {
    if (messages.length > 0 && !isLoading && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
    // On ne veut déclencher ceci qu'au chargement initial
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  const handleRate = useCallback(async (messageId: string, rating: number | null) => {
    if (!activeThreadId) return;
    try {
      await rateMessage(activeThreadId, messageId, rating);
      dispatch({ type: "RATE_MESSAGE", messageId, rating });
    } catch {
      // silently ignore
    }
  }, [activeThreadId, dispatch]);

  const handleDelete = useCallback(async (messageId: string) => {
    if (!activeThreadId) return;
    try {
      await deleteMessage(activeThreadId, messageId);
      dispatch({ type: "REMOVE_MESSAGE", messageId });
    } catch {
      // silently ignore
    }
  }, [activeThreadId, dispatch]);

  const handleLoadMore = useCallback(() => {
    if (containerRef.current) {
      prevScrollHeightRef.current = containerRef.current.scrollHeight;
      isPrependingRef.current = true;
    }
    onLoadMore();
  }, [onLoadMore]);

  // IntersectionObserver sur la sentinelle en haut
  useEffect(() => {
    if (!hasMore || isLoadingMore || isLoading) return;

    const sentinel = sentinelRef.current;
    const container = containerRef.current;
    if (!sentinel || !container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          handleLoadMore();
        }
      },
      { root: container, threshold: 0.1 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, isLoading, handleLoadMore]);

  if (isLoading) {
    return <MessageSkeleton />;
  }

  return (
    <div ref={containerRef} className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-3xl py-4">
        {/* Message de fin de conversation */}
        {!hasMore && messages.length > 0 && (
          <div className="py-4 text-center text-sm text-zinc-400 dark:text-zinc-500">
            Pas d&apos;autres messages dans la conversation
          </div>
        )}

        {/* Spinner de chargement des anciens messages */}
        {isLoadingMore && (
          <div className="flex justify-center py-4">
            <Spinner className="text-zinc-400" />
          </div>
        )}

        {/* Sentinelle pour déclencher le chargement */}
        {hasMore && !isLoadingMore && (
          <div ref={sentinelRef} className="h-1" />
        )}

        {messages.map((msg, i) => (
          <div key={msg.id} ref={i === messages.length - 1 ? lastMsgRef : undefined}>
            <MessageBubble message={msg} onRate={handleRate} onDelete={handleDelete} />
          </div>
        ))}
        {isSending && (
          <div ref={sendingRef} className="flex gap-3 px-4 py-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400">
              <Spinner className="text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="flex items-center rounded-2xl bg-zinc-100 px-4 py-2.5 dark:bg-zinc-800">
              <span className="text-sm text-zinc-500">En train de réfléchir...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
