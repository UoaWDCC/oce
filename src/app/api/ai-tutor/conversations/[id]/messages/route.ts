import { NextRequest, NextResponse } from "next/server";
import { authenticateUser } from "@/utils/authHelper";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const DEFAULT_LIMIT = 15;
const MAX_LIMIT = 100;
const base10IntegerRegex = /^\d+$/;

function parseCount(value: string | null, fallback: number): number | null {
  if (value === null) return fallback;
  if (!base10IntegerRegex.test(value)) return null;

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

// GET /api/ai-tutor/conversations/:id/messages?limit=15&offset=0
// Returns a page of messages for a conversation owned by the authenticated
// user. Pages walk backwards from the newest message, so offset 0 is the most
// recent page. Each page is returned oldest to newest so the chat can render
// it chronologically without reordering.
export async function GET(
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

    const { searchParams } = new URL(req.url);
    const requestedLimit = parseCount(searchParams.get("limit"), DEFAULT_LIMIT);
    const offset = parseCount(searchParams.get("offset"), 0);

    if (requestedLimit === null || requestedLimit === 0 || offset === null) {
      return NextResponse.json(
        {
          error:
            "limit must be a positive base-10 integer and offset must be a non-negative base-10 integer",
        },
        { status: 400, headers: corsHeaders },
      );
    }

    const limit = Math.min(requestedLimit, MAX_LIMIT);

    const { data: conversation, error: conversationError } = await supabase
      .from("conversations")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (conversationError) {
      return NextResponse.json(
        { error: conversationError.message },
        { status: 500, headers: corsHeaders },
      );
    }

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404, headers: corsHeaders },
      );
    }

    // Fetch one extra row to tell whether an older page exists, without a
    // second count query.
    const { data: page, error } = await supabase
      .from("messages")
      .select("id, conversation_id, role, content, is_favourite, created_at")
      .eq("conversation_id", id)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + limit);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500, headers: corsHeaders },
      );
    }

    const rows = page ?? [];
    const hasMore = rows.length > limit;
    const messages = rows.slice(0, limit).reverse();

    return NextResponse.json(
      { messages, hasMore, nextOffset: offset + messages.length },
      { status: 200, headers: corsHeaders },
    );
  } catch (error) {
    console.error(
      "GET /api/ai-tutor/conversations/[id]/messages failed:",
      error,
    );
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
