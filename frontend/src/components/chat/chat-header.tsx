"use client";

import { useState } from "react";
import { Settings, PanelRightOpen, PanelLeftOpen, PanelLeftClose } from "lucide-react";
import { useChatState, useChatDispatch } from "@/contexts/chat-context";
import { useSidebar } from "@/hooks/use-sidebar";
import { ThreadSettingsModal } from "./thread-settings-modal";
import type { Thread } from "@/types";

export function ChatHeader() {
  const { threads, activeThreadId, sidebarOpen } = useChatState();
  const dispatch = useChatDispatch();
  const { toggle } = useSidebar();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const activeThread: Thread | undefined = threads.find(
    (t) => t.id === activeThreadId,
  );

  return (
    <>
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-200 px-4 dark:border-zinc-800">
        <div className="flex items-center gap-3 overflow-hidden">
          <button
            onClick={toggle}
            className="shrink-0 rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            {sidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
          </button>
          <h1 className="shrink-0 text-lg font-bold text-zinc-900 dark:text-zinc-100">
            SuperQ
          </h1>
          {activeThread && (
            <>
              <span className="text-zinc-300 dark:text-zinc-600">/</span>
              <h2 className="truncate text-sm font-medium text-zinc-600 dark:text-zinc-400">
                {activeThread.title || "Sans titre"}
              </h2>
            </>
          )}
        </div>

        {activeThread && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSettingsOpen(true)}
              className="shrink-0 rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            >
              <Settings size={18} />
            </button>
            <button
              onClick={() => dispatch({ type: "TOGGLE_RIGHT_SIDEBAR" })}
              className="shrink-0 rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            >
              <PanelRightOpen size={18} />
            </button>
          </div>
        )}
      </header>

      {activeThread && (
        <ThreadSettingsModal
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          thread={activeThread}
        />
      )}
    </>
  );
}
