"use client";

import { use, useEffect } from "react";
import { useChatDispatch } from "@/contexts/chat-context";
import { ChatArea } from "@/components/chat/chat-area";

export default function ThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const dispatch = useChatDispatch();

  useEffect(() => {
    dispatch({ type: "SET_ACTIVE_THREAD", threadId: id });

    return () => {
      dispatch({ type: "SET_ACTIVE_THREAD", threadId: null });
    };
  }, [id, dispatch]);

  return <ChatArea />;
}
