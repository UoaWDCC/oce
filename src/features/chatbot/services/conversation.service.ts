import { API_URL } from "@/utils/config";
import { CreateConversationResponse } from "@app-types/conversations";
import { createClient } from "@/utils/supabase/client";

export async function createConversation() {
  const supabase = createClient();
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token;

  const response = await fetch(`${API_URL}/ai-tutor/conversations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const result: CreateConversationResponse = await response.json();
  console.log(result);

  return result;
}
