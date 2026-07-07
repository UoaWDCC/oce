import { createClient } from "@/utils/supabase/client";
import { Conversation } from "@/features/chatbot/types";

export async function getConversations(): Promise<Conversation[]> {
  const supabase = createClient();
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token;

  const res = await fetch("/api/ai-tutor/conversations", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch conversations");
  }

  const data = (await res.json()) as { conversation?: unknown };
  if (!Array.isArray(data.conversation)) {
    throw new Error("Invalid conversations response");
  }

  return data.conversation as Conversation[];
}
