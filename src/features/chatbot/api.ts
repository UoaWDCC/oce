import { createClient } from "@/utils/supabase/client";
import type { Conversation, TutorMessage } from "@/features/chatbot/types";

async function getAccessToken() {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;

  if (!accessToken) {
    throw new Error("You must be logged in to use the AI Tutor.");
  }

  return accessToken;
}

async function apiFetch(path: string, init: RequestInit = {}) {
  const accessToken = await getAccessToken();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(path, { ...init, headers });

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(data?.error ?? "AI Tutor request failed.");
  }

  return response;
}

export async function createConversation(): Promise<Conversation> {
  const response = await apiFetch("/api/ai-tutor/conversations", {
    method: "POST",
  });
  const data = (await response.json()) as { conversation: Conversation };
  return data.conversation;
}

export async function saveUserMessage(
  conversationId: string,
  content: string,
): Promise<TutorMessage> {
  const response = await apiFetch("/api/ai-tutor/chat", {
    method: "POST",
    body: JSON.stringify({ conversation_id: conversationId, content }),
  });
  const data = (await response.json()) as { message: TutorMessage };
  return data.message;
}
