import { createClient } from "@/utils/supabase/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// POST /api/ai-tutor/chat
// Saves a message to the messages table for a given conversation.
// Used by the frontend (role: 'user') and the LLM service (role: 'assistant').
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

    const body = await req.json();
    const { conversation_id, content, role } = body;

    if (!conversation_id || !content || !role) {
      return Response.json(
        { error: "conversation_id, content, and role are required" },
        { status: 400, headers: corsHeaders },
      );
    }

    if (role !== "user" && role !== "assistant") {
      return Response.json(
        { error: "role must be 'user' or 'assistant'" },
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
      .insert({ conversation_id, role, content })
      .select("*")
      .single();

    if (insertError) {
      return Response.json(
        { error: insertError.message },
        { status: 500, headers: corsHeaders },
      );
    }

    return Response.json(
      { message },
      { status: 201, headers: corsHeaders },
    );
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
