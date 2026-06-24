import { NextRequest, NextResponse } from "next/server";
import { authenticateUser } from "@/utils/authHelper";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// PATCH /api/ai-tutor/conversations/:id
// Ends a conversation by setting its status to "ended"
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authenticateUser(req, corsHeaders);
    if (auth.response) return auth.response;
    const { supabase, user } = auth;

    const { id } = await params;

    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { error: "Invalid conversation ID" },
        { status: 400, headers: corsHeaders },
      );
    }

    const { data: updated, error } = await supabase
      .from("conversations")
      .update({ status: "ended" })
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id, status")
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500, headers: corsHeaders },
      );
    }

    if (!updated) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404, headers: corsHeaders },
      );
    }

    return NextResponse.json(
      { conversation: updated },
      { status: 200, headers: corsHeaders },
    );
  } catch (error) {
    console.error("PATCH /api/ai-tutor/conversations/[id] failed:", error);
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
