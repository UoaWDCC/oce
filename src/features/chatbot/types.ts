export interface ChatMessageType {
  type: "user" | "bot";
  message: string;
}

export interface Conversation {
  id: string;
  title: string | null;
  status: string;
  created_at: string;
}
