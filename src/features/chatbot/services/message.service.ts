import { ChatMessageRequestBody } from "@/app/api/ai-tutor/chat/route";
import { API_URL } from "@/utils/config";
// import { CreateConversationResponse } from "@app-types/conversations";
import { createClient } from "@/utils/supabase/client";

export async function createMessage({
  conversation_id,
  content,
}: ChatMessageRequestBody) {
  const supabase = createClient();
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token;

  const response = await fetch(`${API_URL}/ai-tutor/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      conversation_id: conversation_id as string,
      content: content as string,
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error("Failed to create new message");
  }

  return result as Message;
}
