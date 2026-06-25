import { createClient } from "@/utils/supabase/server";
import { createLLMProvider } from "@/llm/LLMProviderFactory";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

type ChatMessageRequestBody = {
  conversation_id?: unknown;
  content?: unknown;
};

// POST /api/ai-tutor/chat
// Saves a user message to the messages table for a given conversation.
// The role is forced to 'user' server-side so an authenticated caller cannot
// forge assistant messages. Saving assistant replies is handled by #24.
export async function POST(req: Request) {
  try {
    const accessToken = req.headers
      .get("Authorization")
      ?.replace("Bearer ", "");

    if (!accessToken) {
      return Response.json(
        { error: "Unauthorized" },
        { status: 401, headers: corsHeaders },
      );
    }

    const supabase = await createClient(accessToken);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return Response.json(
        { error: "Invalid auth token" },
        { status: 401, headers: corsHeaders },
      );
    }

    let body: ChatMessageRequestBody;

    try {
      body = (await req.json()) as ChatMessageRequestBody;
    } catch {
      return Response.json(
        { error: "Invalid JSON body" },
        { status: 400, headers: corsHeaders },
      );
    }

    const { conversation_id, content } = body;

    if (
      typeof conversation_id !== "string" ||
      conversation_id.trim().length === 0 ||
      typeof content !== "string" ||
      content.trim().length === 0
    ) {
      return Response.json(
        { error: "conversation_id and content must be non-empty strings" },
        { status: 400, headers: corsHeaders },
      );
    }

    const { data: conversation, error: conversationError } = await supabase
      .from("conversations")
      .select("id")
      .eq("id", conversation_id)
      .eq("user_id", user.id)
      .single();

    if (conversationError || !conversation) {
      return Response.json(
        { error: "Conversation not found" },
        { status: 404, headers: corsHeaders },
      );
    }

    const { data: message, error: insertError } = await supabase
      .from("messages")
      .insert({ conversation_id, role: "user", content })
      .select("*")
      .single();

    if (insertError) {
      return Response.json(
        { error: insertError.message },
        { status: 500, headers: corsHeaders },
      );
    }

    await supabase
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversation_id);

    // Check if conversation already has a title
    const { data: titledConversation } = await supabase
      .from("conversations")
      .select("title")
      .eq("id", conversation_id)
      .single();

    if (!titledConversation?.title) {
      try {
        const provider = createLLMProvider();
        const title = await provider.complete(
          [
            {
              role: "user",
              content: `Generate one concise, natural conversation title in sentence case.
Keep it under 10 words.
Return only the title, with no quotes, bullet points, or explanation.

User message: ${content.trim()}`,
            },
          ],
          {},
        );
        const cleanedTitle = title
          .trim()
          .replace(/^["']|["']$/g, "")
          .slice(0, 80);

        if (cleanedTitle) {
          await supabase
            .from("conversations")
            .update({ title: cleanedTitle })
            .eq("id", conversation_id);
        }
      } catch (error) {
        console.warn("AI tutor title generation failed:", error);
      }
    }

    return Response.json({ message }, { status: 201, headers: corsHeaders });
  } catch (error) {
    console.error("POST /api/ai-tutor/chat failed:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500, headers: corsHeaders },
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
}
