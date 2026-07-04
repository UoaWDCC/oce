export interface ChatMessageType {
  type: "user" | "bot";
  message: string;
  id?: string;
  favourited?: boolean;
}
