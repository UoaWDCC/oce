import { createClient } from "@/utils/supabase/client";
import { Conversation } from "@/features/chatbot/types";

// Passing a query filters by a case-insensitive partial match on title
// (see the ?q= handling in /api/ai-tutor/conversations).
export async function getConversations(
  query?: string,
): Promise<Conversation[]> {
  const supabase = createClient();
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token;

  const search = query?.trim();
  const url = search
    ? `/api/ai-tutor/conversations?q=${encodeURIComponent(search)}`
    : "/api/ai-tutor/conversations";

  const res = await fetch(url, {
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

export async function endConversation(id: string): Promise<void> {
  const supabase = createClient();
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token;

  const res = await fetch(`/api/ai-tutor/conversations/${id}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error("Failed to end conversation");
  }
}
