import { apiFetch } from "@/features/chatbot/utils/apiFetch";
import type { TutorRequest } from "../types";

export async function createTutorRequest(
  conversationId: string,
  question: string,
): Promise<TutorRequest | null> {
  const response = await apiFetch(
    "/api/ai-tutor/tutor-requests",
    {
      method: "POST",
      body: JSON.stringify({
        conversation_id: conversationId,
        question,
      }),
    },
    true,
  );
  const data = (await response.json()) as {
    tutor_request?: TutorRequest;
  };

  return data.tutor_request ?? null;
}

export async function getTutorRequests(): Promise<TutorRequest[]> {
  const response = await apiFetch("/api/ai-tutor/tutor-requests", {}, true);
  const data = (await response.json()) as { tutor_requests?: unknown };

  if (!Array.isArray(data.tutor_requests)) {
    throw new Error("Invalid tutor requests response");
  }

  return data.tutor_requests as TutorRequest[];
}
