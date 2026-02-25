import { API_BASE_URL } from "./constants";
import type { Thread, Message, SendMessagePayload, CreateThreadPayload, UpdateThreadPayload, ActiveModel, ActivateModelPayload, PaginatedMessages } from "@/types";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "Unknown error");
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export function fetchThreads(limit: number, offset: number): Promise<Thread[]> {
  return request<Thread[]>(`/threads?limit=${limit}&offset=${offset}`);
}

export function fetchThread(threadId: string): Promise<Thread> {
  return request<Thread>(`/threads/${threadId}`);
}

export function fetchMessages(threadId: string, limit: number, offset: number): Promise<PaginatedMessages> {
  return request<PaginatedMessages>(`/threads/${threadId}/messages?limit=${limit}&offset=${offset}`);
}

export function createThread(payload: CreateThreadPayload): Promise<Thread> {
  return request<Thread>("/threads", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateThread(threadId: string, payload: UpdateThreadPayload): Promise<Thread> {
  return request<Thread>(`/threads/${threadId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteThread(threadId: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/threads/${threadId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "Unknown error");
    throw new Error(`API error ${res.status}: ${text}`);
  }
}

export function sendMessage(
  threadId: string,
  payload: SendMessagePayload,
): Promise<Message> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 600_000);

  return request<Message>(`/threads/${threadId}/messages`, {
    method: "POST",
    body: JSON.stringify(payload),
    signal: controller.signal,
  }).finally(() => clearTimeout(timeoutId));
}

// --- Messages ---

export function rateMessage(threadId: string, messageId: string, rating: number | null): Promise<Message> {
  return request<Message>(`/threads/${threadId}/messages/${messageId}/rate`, {
    method: "PATCH",
    body: JSON.stringify({ rating }),
  });
}

export async function deleteMessage(threadId: string, messageId: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/threads/${threadId}/messages/${messageId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "Unknown error");
    throw new Error(`API error ${res.status}: ${text}`);
  }
}

// --- Models ---

export function fetchActiveModels(): Promise<ActiveModel[]> {
  return request<ActiveModel[]>("/models/models");
}

export function activateModel(payload: ActivateModelPayload): Promise<ActiveModel> {
  return request<ActiveModel>("/models/models", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function deactivateModel(modelId: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/models/models/${modelId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "Unknown error");
    throw new Error(`API error ${res.status}: ${text}`);
  }
}
