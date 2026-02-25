"use client";

import { useMessages } from "@/hooks/use-messages";
import { useChatState, useChatDispatch } from "@/contexts/chat-context";
import { ChatHeader } from "./chat-header";
import { MessageList } from "./message-list";
import { EmptyState } from "./empty-state";
import { ChatInput } from "@/components/input/chat-input";
import { ErrorBanner } from "@/components/ui/error-banner";

export function ChatArea() {
  const { activeThreadId, error } = useChatState();
  const dispatch = useChatDispatch();
  const { messages, isLoading, isSending, hasMoreMessages, isLoadingMoreMessages, send, loadMore } = useMessages();

  async function handleSend(content: string) {
    if (!activeThreadId) return;
    await send(content);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ChatHeader />

      {error && (
        <ErrorBanner
          message={error}
          onDismiss={() => dispatch({ type: "SET_ERROR", error: null })}
        />
      )}

      {!activeThreadId && messages.length === 0 ? (
        <EmptyState />
      ) : (
        <MessageList
          messages={messages}
          isLoading={isLoading}
          isSending={isSending}
          onLoadMore={loadMore}
          hasMore={hasMoreMessages}
          isLoadingMore={isLoadingMoreMessages}
        />
      )}

      <ChatInput onSend={handleSend} disabled={isSending || !activeThreadId} />
    </div>
  );
}
