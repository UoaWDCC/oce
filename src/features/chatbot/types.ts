export interface ChatMessageType {
  type: "user" | "bot";
  message: string;
  id?: string;
  favourited?: boolean;
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string | null;
  status: string;
  created_at: string;
  updated_at: string;
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
