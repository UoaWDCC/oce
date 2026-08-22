import { NextRequest, NextResponse } from "next/server";
import { authenticateUser } from "@/utils/authHelper";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const MAX_SEARCH_QUERY_LENGTH = 200;

// Escapes ILIKE wildcard characters so search input is matched literally.
function escapeIlikePattern(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_")
    .replace(/\*/g, "\\*");
}

// GET /api/ai-tutor/conversations
// Returns all non-deleted (active) conversations for the authenticated user,
// optionally filtered by a case-insensitive partial match on title via ?q=
export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateUser(req, corsHeaders);
    if (auth.response) return auth.response;
    const { supabase, user } = auth;

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim().slice(0, MAX_SEARCH_QUERY_LENGTH);

    const offset = Math.max(
      1,
      Number.parseInt(searchParams.get("offset") ?? "1", 10) || 1,
    );

    const limit = Math.min(
      50,
      Math.max(1, Number.parseInt(searchParams.get("limit") ?? "20", 10) || 20),
    );

    const from = (offset - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from("conversations")
      .select("id, user_id, status, title, created_at, updated_at", {
        count: "exact",
      })
      .eq("user_id", user.id)
      .neq("status", "ended");

    if (q) {
      query = query.ilike("title", `%${escapeIlikePattern(q)}%`);
    }

    const {
      data: conversation,
      error,
      count,
    } = await query
      .order("updated_at", {
        ascending: false,
      })
      .range(from, to);

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

    const total = count ?? 0;
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json(
      {
        conversation,
        nextOffset: offset + 1,
        hasMore: offset < totalPages,
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
