export type AssistantResponseStatus =
  "streaming" | "persisted" | "incomplete" | "unsaved";

export interface ChatMessageType {
  type: "user" | "bot";
  message: string;
  id?: string;
  favourited?: boolean;
  conversationId?: string;
  createdAt?: string;
  clientId?: string;
  responseStatus?: AssistantResponseStatus;
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface GetConversationsResponse {
  conversation: Conversation[];
  nextOffset: number;
  hasMore: boolean;
}
export interface GetMessagesResponse {
  messages: TutorMessage[];
  nextOffset: number;
  hasMore: boolean;
}

// Response of GET /api/ai-tutor/token-usage. Named "Summary" to stay distinct
// from the per-request TokenUsage in @/llm/types/TokenUsage.
export interface TokenUsageSummary {
  availableTokens: number;
  usedTokens: number;
  totalTokens: number;
  oldestMessage: string | null;
}

export interface TutorMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  is_favourite: boolean;
  created_at: string;
}

export interface FavouriteMessage {
  id: string;
  content: string;
  conversation_id: string;
  conversation_title: string | null;
  created_at: string;
  favourited_at: string | null;
}
