export interface ChatMessageType {
  type: "user" | "bot";
  message: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string | null;
  status: string;
  created_at: string;
}

export interface TutorMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  is_favourite: boolean;
  created_at: string;
}
