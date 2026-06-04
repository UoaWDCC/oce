import { NextRequest, NextResponse } from "next/server";
import { authenticateUser } from "@/utils/authHelper";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};


// GET /api/ai-tutor/conversations
// Returns all non-deleted (active) conversations for the authenticated user
export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateUser(req, corsHeaders);
    if (auth.response) return auth.response;
    const { supabase, user } = auth;

    const { data: conversation, error } = await supabase
      .from("conversations")
      .select("id, user_id, status, created_at")
      .eq("user_id", user.id)
      .neq("status", "ended")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500, headers: corsHeaders },
      );
    }

    return NextResponse.json(
      { conversation },
      { status: 200, headers: corsHeaders },
    );
  } catch (error) {
    console.error("GET /api/ai-tutor/conversations failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: corsHeaders },
    );
  }
}

// POST /api/ai-tutor/conversations
// Creates a new active conversation for the user
export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateUser(req, corsHeaders);
    if (auth.response) return auth.response;
    const { supabase, user } = auth;

    const { data: newConversation, error: postError } = await supabase
      .from("conversations")
      .insert({ user_id: user.id, status: "active" })
      .select("id, user_id, status, created_at")
      .single();

    if (postError) {
      return NextResponse.json(
        { error: postError.message },
        { status: 500, headers: corsHeaders },
      );
    }

    return NextResponse.json(
      { conversation: newConversation },
      { status: 201, headers: corsHeaders },
    );
  } catch (error) {
    console.error("POST /api/ai-tutor/conversations failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: corsHeaders },
    );
  }
}

// Handles browser preflight requests
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
}
