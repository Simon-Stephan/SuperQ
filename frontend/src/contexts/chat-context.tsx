"use client";

import {
  createContext,
  useContext,
  useReducer,
  type Dispatch,
  type ReactNode,
} from "react";
import type { Thread, Message } from "@/types";

export interface ChatState {
  threads: Thread[];
  activeThreadId: string | null;
  messages: Message[];
  isLoadingThreads: boolean;
  isLoadingMessages: boolean;
  isSending: boolean;
  hasMoreMessages: boolean;
  isLoadingMoreMessages: boolean;
  totalMessages: number;
  error: string | null;
  sidebarOpen: boolean;
  rightSidebarOpen: boolean;
  selectedModel: string;
}

export type ChatAction =
  | { type: "SET_THREADS"; threads: Thread[] }
  | { type: "APPEND_THREADS"; threads: Thread[] }
  | { type: "ADD_THREAD"; thread: Thread }
  | { type: "REMOVE_THREAD"; threadId: string }
  | { type: "UPDATE_THREAD"; thread: Thread }
  | { type: "SET_ACTIVE_THREAD"; threadId: string | null }
  | { type: "SET_MESSAGES"; messages: Message[] }
  | { type: "ADD_MESSAGE"; message: Message }
  | { type: "UPDATE_LAST_ASSISTANT_MESSAGE"; content: string }
  | { type: "SET_LOADING_THREADS"; loading: boolean }
  | { type: "SET_LOADING_MESSAGES"; loading: boolean }
  | { type: "SET_SENDING"; sending: boolean }
  | { type: "PREPEND_MESSAGES"; messages: Message[] }
  | { type: "SET_HAS_MORE_MESSAGES"; hasMore: boolean }
  | { type: "SET_LOADING_MORE_MESSAGES"; loading: boolean }
  | { type: "SET_TOTAL_MESSAGES"; total: number }
  | { type: "SET_ERROR"; error: string | null }
  | { type: "TOGGLE_SIDEBAR" }
  | { type: "SET_SIDEBAR_OPEN"; open: boolean }
  | { type: "TOGGLE_RIGHT_SIDEBAR" }
  | { type: "SET_RIGHT_SIDEBAR_OPEN"; open: boolean }
  | { type: "SET_MODEL"; model: string }
  | { type: "RATE_MESSAGE"; messageId: string; rating: number | null }
  | { type: "REMOVE_MESSAGE"; messageId: string }
  | { type: "FINALIZE_USER_MESSAGE"; tempId: string; realId: string };

const initialState: ChatState = {
  threads: [],
  activeThreadId: null,
  messages: [],
  isLoadingThreads: false,
  isLoadingMessages: false,
  isSending: false,
  hasMoreMessages: true,
  isLoadingMoreMessages: false,
  totalMessages: 0,
  error: null,
  sidebarOpen: true,
  rightSidebarOpen: false,
  selectedModel: "",
};

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case "SET_THREADS":
      return { ...state, threads: action.threads };
    case "APPEND_THREADS":
      return { ...state, threads: [...state.threads, ...action.threads] };
    case "ADD_THREAD":
      return { ...state, threads: [action.thread, ...state.threads] };
    case "REMOVE_THREAD": {
      const threads = state.threads.filter((t) => t.id !== action.threadId);
      const isActive = state.activeThreadId === action.threadId;
      return {
        ...state,
        threads,
        activeThreadId: isActive ? null : state.activeThreadId,
        messages: isActive ? [] : state.messages,
      };
    }
    case "UPDATE_THREAD":
      return {
        ...state,
        threads: state.threads.map((t) =>
          t.id === action.thread.id ? action.thread : t,
        ),
      };
    case "SET_ACTIVE_THREAD":
      return {
        ...state,
        activeThreadId: action.threadId,
        messages: [],
        hasMoreMessages: false,
        isLoadingMoreMessages: false,
        isLoadingMessages: action.threadId !== null,
        totalMessages: 0,
      };
    case "SET_MESSAGES":
      return { ...state, messages: action.messages };
    case "ADD_MESSAGE":
      return { ...state, messages: [...state.messages, action.message] };
    case "UPDATE_LAST_ASSISTANT_MESSAGE": {
      const msgs = [...state.messages];
      const lastIdx = msgs.findLastIndex((m) => m.role === "assistant");
      if (lastIdx !== -1) {
        msgs[lastIdx] = { ...msgs[lastIdx], content: action.content };
      }
      return { ...state, messages: msgs };
    }
    case "SET_LOADING_THREADS":
      return { ...state, isLoadingThreads: action.loading };
    case "SET_LOADING_MESSAGES":
      return { ...state, isLoadingMessages: action.loading };
    case "SET_SENDING":
      return { ...state, isSending: action.sending };
    case "PREPEND_MESSAGES":
      return { ...state, messages: [...action.messages, ...state.messages] };
    case "SET_HAS_MORE_MESSAGES":
      return { ...state, hasMoreMessages: action.hasMore };
    case "SET_LOADING_MORE_MESSAGES":
      return { ...state, isLoadingMoreMessages: action.loading };
    case "SET_TOTAL_MESSAGES":
      return { ...state, totalMessages: action.total };
    case "SET_ERROR":
      return { ...state, error: action.error };
    case "TOGGLE_SIDEBAR":
      return { ...state, sidebarOpen: !state.sidebarOpen };
    case "SET_SIDEBAR_OPEN":
      return { ...state, sidebarOpen: action.open };
    case "TOGGLE_RIGHT_SIDEBAR":
      return { ...state, rightSidebarOpen: !state.rightSidebarOpen };
    case "SET_RIGHT_SIDEBAR_OPEN":
      return { ...state, rightSidebarOpen: action.open };
    case "SET_MODEL":
      return { ...state, selectedModel: action.model };
    case "RATE_MESSAGE":
      return {
        ...state,
        messages: state.messages.map((m) =>
          m.id === action.messageId ? { ...m, rating: action.rating } : m,
        ),
      };
    case "REMOVE_MESSAGE": {
      const target = state.messages.find((m) => m.id === action.messageId);
      if (!target) return state;

      const idsToRemove = new Set<string>([target.id]);

      if (target.answer_of) {
        // C'est un assistant → supprimer aussi le user correspondant
        idsToRemove.add(target.answer_of);
      } else {
        // C'est un user → supprimer l'assistant ayant answer_of === cet ID
        const linked = state.messages.find((m) => m.answer_of === target.id);
        if (linked) idsToRemove.add(linked.id);
      }

      return {
        ...state,
        messages: state.messages.filter((m) => !idsToRemove.has(m.id)),
      };
    }
    case "FINALIZE_USER_MESSAGE":
      return {
        ...state,
        messages: state.messages.map((m) =>
          m.id === action.tempId ? { ...m, id: action.realId } : m,
        ),
      };
    default:
      return state;
  }
}

const ChatStateContext = createContext<ChatState>(initialState);
const ChatDispatchContext = createContext<Dispatch<ChatAction>>(() => {});

export function ChatProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(chatReducer, initialState);

  return (
    <ChatStateContext value={state}>
      <ChatDispatchContext value={dispatch}>{children}</ChatDispatchContext>
    </ChatStateContext>
  );
}

export function useChatState() {
  return useContext(ChatStateContext);
}

export function useChatDispatch() {
  return useContext(ChatDispatchContext);
}
