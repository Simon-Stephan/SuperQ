"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useChatState, useChatDispatch } from "@/contexts/chat-context";
import * as api from "@/lib/api";
import { THREADS_PAGE_SIZE } from "@/lib/constants";
import type { CreateThreadPayload } from "@/types";

export function useThreads() {
  const state = useChatState();
  const dispatch = useChatDispatch();
  const router = useRouter();
  const hasMoreRef = useRef(true);
  const isLoadingMoreRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      dispatch({ type: "SET_LOADING_THREADS", loading: true });
      dispatch({ type: "SET_ERROR", error: null });
      try {
        const threads = await api.fetchThreads(THREADS_PAGE_SIZE, 0);
        if (!cancelled) {
          dispatch({ type: "SET_THREADS", threads });
          hasMoreRef.current = threads.length >= THREADS_PAGE_SIZE;
        }
      } catch (err) {
        if (!cancelled) {
          dispatch({
            type: "SET_ERROR",
            error: err instanceof Error ? err.message : "Failed to load threads",
          });
        }
      } finally {
        if (!cancelled) {
          dispatch({ type: "SET_LOADING_THREADS", loading: false });
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  async function loadMore() {
    if (!hasMoreRef.current || isLoadingMoreRef.current || state.isLoadingThreads) {
      return;
    }

    isLoadingMoreRef.current = true;
    try {
      const offset = state.threads.length;
      const threads = await api.fetchThreads(THREADS_PAGE_SIZE, offset);
      dispatch({ type: "APPEND_THREADS", threads });
      hasMoreRef.current = threads.length >= THREADS_PAGE_SIZE;
    } catch (err) {
      dispatch({
        type: "SET_ERROR",
        error: err instanceof Error ? err.message : "Failed to load more threads",
      });
    } finally {
      isLoadingMoreRef.current = false;
    }
  }

  async function createNewThread(payload: CreateThreadPayload) {
    dispatch({ type: "SET_ERROR", error: null });
    try {
      const thread = await api.createThread(payload);
      dispatch({ type: "ADD_THREAD", thread });
      dispatch({ type: "SET_ACTIVE_THREAD", threadId: thread.id });
      router.push(`/thread/${thread.id}`);
      return thread;
    } catch (err) {
      dispatch({
        type: "SET_ERROR",
        error: err instanceof Error ? err.message : "Failed to create thread",
      });
      return null;
    }
  }

  function selectThread(threadId: string) {
    dispatch({ type: "SET_ACTIVE_THREAD", threadId });
    router.push(`/thread/${threadId}`);
  }

  async function deleteThread(threadId: string) {
    const wasActive = state.activeThreadId === threadId;
    dispatch({ type: "SET_ERROR", error: null });
    try {
      await api.deleteThread(threadId);
      dispatch({ type: "REMOVE_THREAD", threadId });
      if (wasActive) {
        router.push("/");
      }
    } catch (err) {
      dispatch({
        type: "SET_ERROR",
        error: err instanceof Error ? err.message : "Failed to delete thread",
      });
    }
  }

  return {
    threads: state.threads,
    activeThreadId: state.activeThreadId,
    isLoading: state.isLoadingThreads,
    hasMore: hasMoreRef.current,
    loadMore,
    createNewThread,
    selectThread,
    deleteThread,
  };
}
