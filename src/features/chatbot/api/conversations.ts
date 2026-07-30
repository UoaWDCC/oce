import { Conversation, TutorMessage } from "@/features/chatbot/types";
import type { Message } from "@/llm/types/Message";
import { apiFetch } from "../utils/apiFetch";

export async function getConversations(): Promise<Conversation[]> {
  const response = await apiFetch("/api/ai-tutor/conversations", {}, true);
  const data = (await response.json()) as { conversation: Conversation[] };

  return data.conversation;
}
export async function createConversation(): Promise<Conversation> {
  const response = await apiFetch(
    "/api/ai-tutor/conversations",
    {
      method: "POST",
    },
    true,
  );
  const data = (await response.json()) as { conversation: Conversation };
  return data.conversation;
}

export async function getConversationMessages(
  conversationId: string,
): Promise<TutorMessage[]> {
  const response = await apiFetch(
    `/api/ai-tutor/conversations/${conversationId}/messages`,
    {},
    true,
  );
  const data = (await response.json()) as { messages: TutorMessage[] };
  return data.messages;
}

export async function saveUserMessage(
  conversationId: string,
  content: string,
): Promise<TutorMessage> {
  const response = await apiFetch(
    "/api/ai-tutor/chat",
    {
      method: "POST",
      body: JSON.stringify({ conversation_id: conversationId, content }),
    },
    true,
  );
  const data = (await response.json()) as { message: TutorMessage };
  return data.message;
}

interface StreamAssistantMessageHandlers {
  onText: (text: string) => void;
  onMessageId: (id: string) => void;
}

function parseStreamPayload(
  payload: string,
  handlers: StreamAssistantMessageHandlers,
) {
  for (const line of payload.split("\n")) {
    if (!line.startsWith("data:")) {
      continue;
    }

    const data = line.slice("data:".length).trimStart();

    if (data === "[DONE]") {
      continue;
    }

    if (data.startsWith("[MESSAGE_ID]")) {
      const messageId = data.slice("[MESSAGE_ID]".length).trim();

      if (messageId) {
        handlers.onMessageId(messageId);
      }

      continue;
    }

    // Text chunks are JSON-encoded server-side to preserve newlines and
    // leading whitespace. Fall back to the raw payload so an older,
    // unencoded stream still renders.
    let text = data;
    try {
      const parsed = JSON.parse(data) as unknown;
      if (typeof parsed === "string") {
        text = parsed;
      }
    } catch {
      // Not JSON — treat as raw text.
    }

    handlers.onText(text);
  }
}

export async function streamAssistantMessage(
  conversationId: string,
  messages: Message[],
  handlers: StreamAssistantMessageHandlers,
) {
  const response = await apiFetch(
    "/api/ai-tutor/chat/stream",
    {
      method: "POST",
      body: JSON.stringify({ conversation_id: conversationId, messages }),
    },
    true,
  );

  if (!response.body) {
    throw new Error("AI Tutor stream did not return a response body.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { value, done } = await reader.read();

    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";

    for (const event of events) {
      parseStreamPayload(event, handlers);
    }
  }

  buffer += decoder.decode();

  if (buffer) {
    parseStreamPayload(buffer, handlers);
  }
}
