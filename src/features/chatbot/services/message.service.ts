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

  const result: Message = await response.json();

  //TODO: there is no default error component, so if this does result in an error, it is not displayed appropriately into the frontend.

  console.log(result);

  return result;
}
