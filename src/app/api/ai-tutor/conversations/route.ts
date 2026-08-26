import { NextRequest, NextResponse } from "next/server";
import { authenticateUser } from "@/utils/authHelper";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const MAX_SEARCH_QUERY_LENGTH = 200;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const base10IntegerRegex = /^\d+$/;

function parseCount(value: string | null, fallback: number): number | null {
  if (value === null) return fallback;
  if (!base10IntegerRegex.test(value)) return null;

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

// Escapes ILIKE wildcard characters so search input is matched literally.
function escapeIlikePattern(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_")
    .replace(/\*/g, "\\*");
}

// GET /api/ai-tutor/conversations?limit=20&offset=0
// Returns a newest-first page of non-ended conversations for the authenticated
// user, optionally filtered by a case-insensitive partial title match via ?q=.
export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateUser(req, corsHeaders);
    if (auth.response) return auth.response;
    const { supabase, user } = auth;

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim().slice(0, MAX_SEARCH_QUERY_LENGTH);
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

    let query = supabase
      .from("conversations")
      .select("id, user_id, status, title, created_at, updated_at")
      .eq("user_id", user.id)
      .neq("status", "ended");

    if (q) {
      query = query.ilike("title", `%${escapeIlikePattern(q)}%`);
    }

    // Fetch one extra row to determine whether another page exists without a
    // separate count query.
    const { data: page, error } = await query
      .order("updated_at", {
        ascending: false,
      })
      .order("id", { ascending: false })
      .range(offset, offset + limit);

    if (error) {
      console.error(
        "GET /api/ai-tutor/conversations database query failed:",
        error,
      );
      return NextResponse.json(
        { error: "Failed to fetch conversations" },
        { status: 500, headers: corsHeaders },
      );
    }

    const rows = page ?? [];
    const hasMore = rows.length > limit;
    const conversation = rows.slice(0, limit);

    return NextResponse.json(
      {
        conversation,
        hasMore,
        nextOffset: offset + conversation.length,
      },
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
      .select("id, user_id, status, title, created_at")
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
