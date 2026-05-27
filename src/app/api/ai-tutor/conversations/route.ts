import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};


// GET /api/ai-tutor/conversations
// Gets the active conversation
export async function GET(req: NextRequest) {
  try {
    const accessToken = req.headers
      .get("Authorization")
      ?.replace("Bearer ", "");

    if (!accessToken) {
      return NextResponse.json(
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
      return NextResponse.json(
        { error: "Invalid auth token" },
        { status: 401, headers: corsHeaders },
      );
    }

    const { data: conversation, error } = (await supabase
      .from("conversations")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle());

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
// Creates a new conversation and set previous active conversation to ended
export async function POST(req: NextRequest) {
  try {
    const accessToken = req.headers
      .get("Authorization")
      ?.replace("Bearer ", "");

    if (!accessToken) {
      return NextResponse.json(
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
      return NextResponse.json(
        { error: "Invalid auth token" },
        { status: 401, headers: corsHeaders },
      );
    }

    const { error: updateError } = await supabase
      .from("conversations")
      .update({ status: "ended" })
      .eq("user_id", user.id)
      .eq("status", "active");

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500, headers: corsHeaders },
      );
    }
    const { data: newConversation, error: postError } = (await supabase
      .from("conversations")
      .insert({ user_id: user.id, status: "active" })
      .select("*")
      .single());

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
