"use client";

import { useEffect, useCallback } from "react";
import { useChatState, useChatDispatch } from "@/contexts/chat-context";
import { MESSAGES_PAGE_SIZE } from "@/lib/constants";
import * as api from "@/lib/api";
import type { Message } from "@/types";

export function useMessages() {
  const state = useChatState();
  const dispatch = useChatDispatch();
  const { activeThreadId } = state;

  useEffect(() => {
    if (!activeThreadId) return;
    let cancelled = false;

    async function load() {
      dispatch({ type: "SET_LOADING_MESSAGES", loading: true });
      dispatch({ type: "SET_ERROR", error: null });
      try {
        const data = await api.fetchMessages(activeThreadId!, MESSAGES_PAGE_SIZE, 0);
        if (!cancelled) {
          // Les messages arrivent du plus récent au plus ancien, on les inverse pour l'affichage chrono
          dispatch({ type: "SET_MESSAGES", messages: [...data.messages].reverse() });
          dispatch({ type: "SET_TOTAL_MESSAGES", total: data.total });
          dispatch({ type: "SET_HAS_MORE_MESSAGES", hasMore: data.total > MESSAGES_PAGE_SIZE });
        }
      } catch (err) {
        if (!cancelled) {
          dispatch({
            type: "SET_ERROR",
            error:
              err instanceof Error ? err.message : "Failed to load messages",
          });
        }
      } finally {
        if (!cancelled) {
          dispatch({ type: "SET_LOADING_MESSAGES", loading: false });
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [activeThreadId, dispatch]);

  const loadMore = useCallback(async () => {
    if (!activeThreadId || state.isLoadingMoreMessages || !state.hasMoreMessages) return;

    dispatch({ type: "SET_LOADING_MORE_MESSAGES", loading: true });

    try {
      const offset = state.messages.length;
      const data = await api.fetchMessages(activeThreadId, MESSAGES_PAGE_SIZE, offset);
      // Les messages arrivent du plus récent au plus ancien, on les inverse pour l'ordre chrono
      const olderMessages = [...data.messages].reverse();
      dispatch({ type: "PREPEND_MESSAGES", messages: olderMessages });
      dispatch({
        type: "SET_HAS_MORE_MESSAGES",
        hasMore: offset + data.messages.length < data.total,
      });
    } catch (err) {
      dispatch({
        type: "SET_ERROR",
        error: err instanceof Error ? err.message : "Failed to load more messages",
      });
    } finally {
      dispatch({ type: "SET_LOADING_MORE_MESSAGES", loading: false });
    }
  }, [activeThreadId, state.messages.length, state.isLoadingMoreMessages, state.hasMoreMessages, dispatch]);

  async function send(content: string): Promise<boolean> {
    if (!activeThreadId || !content.trim() || !state.selectedModel) return false;

    dispatch({ type: "SET_ERROR", error: null });
    dispatch({ type: "SET_SENDING", sending: true });

    const optimisticUserMsg: Message = {
      id: `temp-${Date.now()}`,
      role: "user",
      content,
      model_name: null,
      rating: null,
      answer_of: null,
      created_at: new Date().toISOString(),
    };
    dispatch({ type: "ADD_MESSAGE", message: optimisticUserMsg });

    try {
      const assistantMsg = await api.sendMessage(activeThreadId, {
        content,
        model_name: state.selectedModel,
      });

      // Réconcilier l'ID temporaire du message user avec le vrai ID du backend
      if (assistantMsg.answer_of) {
        dispatch({
          type: "FINALIZE_USER_MESSAGE",
          tempId: optimisticUserMsg.id,
          realId: assistantMsg.answer_of,
        });
      }

      dispatch({ type: "ADD_MESSAGE", message: assistantMsg });
      dispatch({ type: "SET_TOTAL_MESSAGES", total: state.totalMessages + 2 });

      // Rafraîchir le thread pour récupérer le résumé mis à jour
      api.fetchThread(activeThreadId).then((updatedThread) => {
        dispatch({ type: "UPDATE_THREAD", thread: updatedThread });
      }).catch(() => {
        // Silencieux : le résumé sera récupéré au prochain chargement
      });

      return true;
    } catch (err) {
      dispatch({
        type: "SET_ERROR",
        error: err instanceof Error ? err.message : "Failed to send message",
      });
      return false;
    } finally {
      dispatch({ type: "SET_SENDING", sending: false });
    }
  }

  return {
    messages: state.messages,
    isLoading: state.isLoadingMessages,
    isSending: state.isSending,
    hasMoreMessages: state.hasMoreMessages,
    isLoadingMoreMessages: state.isLoadingMoreMessages,
    send,
    loadMore,
  };
}
