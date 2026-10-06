import {
  Conversation,
  GetConversationsResponse,
  GetMessagesResponse,
  TutorMessage,
} from "@/features/chatbot/types";
import type { PageContextRequest } from "@/features/chatbot/pageContext";
import type { Message } from "@/llm/types/Message";
import { apiFetch } from "../utils/apiFetch";

// Passing a query filters by a case-insensitive partial match on title
// via ?q=. Pagination is handled with ?offset= and ?limit=.
interface GetConversationsOptions {
  query?: string;
  offset?: number;
  limit?: number;
}

export async function getConversations({
  query,
  offset = 0,
  limit = 20,
}: GetConversationsOptions = {}): Promise<GetConversationsResponse> {
  const params = new URLSearchParams();

  if (query?.trim()) {
    params.set("q", query.trim());
  }

  params.set("offset", offset.toString());
  params.set("limit", limit.toString());

  const response = await apiFetch(
    `/api/ai-tutor/conversations?${params.toString()}`,
    {},
    true,
  );

  const data = (await response.json()) as GetConversationsResponse;

  if (
    !Array.isArray(data.conversation) ||
    typeof data.hasMore !== "boolean" ||
    !Number.isSafeInteger(data.nextOffset) ||
    data.nextOffset < 0
  ) {
    throw new Error("Invalid conversations response");
  }

  return data;
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

interface GetConversationMessagesOptions {
  offset?: number;
  limit?: number;
}

// Pages walk backwards from the newest message (offset 0 is the most recent page)
export async function getConversationMessages(
  conversationId: string,
  { offset = 0, limit = 15 }: GetConversationMessagesOptions = {},
): Promise<GetMessagesResponse> {
  const params = new URLSearchParams();
  params.set("offset", offset.toString());
  params.set("limit", limit.toString());

  const response = await apiFetch(
    `/api/ai-tutor/conversations/${conversationId}/messages?${params.toString()}`,
    {},
    true,
  );

  const data = (await response.json()) as GetMessagesResponse;

  if (
    !Array.isArray(data.messages) ||
    typeof data.hasMore !== "boolean" ||
    !Number.isSafeInteger(data.nextOffset) ||
    data.nextOffset < 0
  ) {
    throw new Error("Invalid messages response");
  }

  return data;
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

export class AssistantStreamError extends Error {
  constructor(
    readonly code:
      "generation_failed" | "persistence_failed" | "incomplete_response",
    message: string,
  ) {
    super(message);
    this.name = "AssistantStreamError";
  }
}

const INCOMPLETE_RESPONSE_MESSAGE =
  "The response was interrupted before completion. Any text received is kept.";

function parseStreamPayload(
  payload: string,
  handlers: StreamAssistantMessageHandlers,
): boolean {
  for (const line of payload.split(/\r?\n/)) {
    if (!line.startsWith("data:")) {
      continue;
    }

    const data = line.slice("data:".length).trimStart();

    if (data === "[DONE]") {
      return true;
    }

    if (data.startsWith("[ERROR]")) {
      let failure: unknown;
      try {
        failure = JSON.parse(data.slice("[ERROR]".length));
      } catch {
        // A malformed terminal event cannot establish a successful response.
      }

      if (
        typeof failure === "object" &&
        failure !== null &&
        "code" in failure &&
        (failure.code === "generation_failed" ||
          failure.code === "persistence_failed") &&
        "message" in failure &&
        typeof failure.message === "string"
      ) {
        throw new AssistantStreamError(failure.code, failure.message);
      }

      throw new AssistantStreamError(
        "incomplete_response",
        INCOMPLETE_RESPONSE_MESSAGE,
      );
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

  return false;
}

export async function streamAssistantMessage(
  conversationId: string,
  messages: Message[],
  handlers: StreamAssistantMessageHandlers,
  pageContext?: PageContextRequest,
) {
  const requestBody = {
    conversation_id: conversationId,
    messages,
    ...(pageContext ? { page_context: { path: pageContext.path } } : {}),
  };

  const response = await apiFetch(
    "/api/ai-tutor/chat/stream",
    {
      method: "POST",
      body: JSON.stringify(requestBody),
    },
    true,
  );

  if (!response.body) {
    throw new AssistantStreamError(
      "incomplete_response",
      "AI Tutor stream did not return a response body.",
    );
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let reachedEOF = false;

  try {
    for (;;) {
      const { value, done } = await reader.read();

      if (done) {
        reachedEOF = true;
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split(/\r?\n\r?\n/);
      buffer = events.pop() ?? "";

      for (const event of events) {
        if (parseStreamPayload(event, handlers)) {
          return;
        }
      }
    }

    buffer += decoder.decode();

    if (buffer && parseStreamPayload(buffer, handlers)) {
      return;
    }

    throw new AssistantStreamError(
      "incomplete_response",
      INCOMPLETE_RESPONSE_MESSAGE,
    );
  } catch (error) {
    if (error instanceof AssistantStreamError) {
      throw error;
    }
    throw new AssistantStreamError(
      "incomplete_response",
      INCOMPLETE_RESPONSE_MESSAGE,
    );
  } finally {
    // Terminal events can arrive before transport EOF. Stop reading only after
    // that outcome is known, and never let cleanup hide the original failure.
    try {
      if (!reachedEOF) {
        await reader.cancel();
      }
    } catch {
      // The body may already be errored or disconnected.
    } finally {
      reader.releaseLock();
    }
  }
}

export async function endConversation(id: string): Promise<void> {
  await apiFetch(
    `/api/ai-tutor/conversations/${id}`,
    { method: "PATCH" },
    true,
  );
}
