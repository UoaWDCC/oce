export interface TutorRequest {
  id: string;
  conversation_id: string;
  question: string;
  status: string;
  created_at: string;
}

export type TutorRequestStatus = "idle" | "loading" | "success" | "error";
