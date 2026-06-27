export interface CreateConversationResponse {
  conversation: {
    id: string;
    user_id: string;
    status: string;
    title: string;
    created_at: string;
  };
}
