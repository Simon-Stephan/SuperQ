"use client";

import { useChatState, useChatDispatch } from "@/contexts/chat-context";

export function useSidebar() {
  const { sidebarOpen } = useChatState();
  const dispatch = useChatDispatch();

  function toggle() {
    dispatch({ type: "TOGGLE_SIDEBAR" });
  }

  function close() {
    dispatch({ type: "SET_SIDEBAR_OPEN", open: false });
  }

  return { sidebarOpen, toggle, close };
}
