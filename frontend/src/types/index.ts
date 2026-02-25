export interface Thread {
  id: string;
  title: string;
  system_prompt: string;
  current_summary: string | null;
  created_at: string;
  messages: Message[];
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  model_name: string | null;
  rating: number | null;
  answer_of: string | null;
  created_at: string;
}

export interface PaginatedMessages {
  messages: Message[];
  total: number;
}

export interface SendMessagePayload {
  content: string;
  model_name: string;
}

export interface CreateThreadPayload {
  title: string;
  system_prompt: string;
}

export interface UpdateThreadPayload {
  title?: string;
  system_prompt?: string;
}

export interface ActiveModel {
  id: string;
  label: string;
  description: string | null;
  model: string;
  is_free: boolean;
  created_at: string;
}

export interface ActivateModelPayload {
  label: string;
  description: string | null;
  model: string;
  is_free: boolean;
}
