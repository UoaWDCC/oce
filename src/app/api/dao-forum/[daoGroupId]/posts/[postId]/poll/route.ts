import { NextRequest, NextResponse } from "next/server";
import { authenticateUser } from "@/utils/authHelper";
import type { ForumPoll } from "@app-types/dao-forum";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

type RouteContext = {
  params: Promise<{ daoGroupId: string; postId: string }>;
};

async function loadPoll(
  supabase: Awaited<ReturnType<typeof authenticateUser>>["supabase"],
  postId: string,
) {
  return supabase!.rpc("get_forum_poll", { p_post_id: postId });
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { postId } = await context.params;
  const auth = await authenticateUser(request, corsHeaders);
  if (auth.response) return auth.response;

  const { data, error } = await loadPoll(auth.supabase, postId);
  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: error.code === "42501" ? 403 : 500, headers: corsHeaders },
    );
  }
  return NextResponse.json(
    { poll: (data as ForumPoll | null) ?? null },
    { headers: corsHeaders },
  );
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { postId } = await context.params;
  const auth = await authenticateUser(request, corsHeaders);
  if (auth.response) return auth.response;

  let optionIds: unknown;
  try {
    ({ optionIds } = (await request.json()) as { optionIds?: unknown });
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400, headers: corsHeaders },
    );
  }

  if (
    !Array.isArray(optionIds) ||
    optionIds.length < 1 ||
    optionIds.length > 6 ||
    optionIds.some((id) => typeof id !== "string") ||
    new Set(optionIds).size !== optionIds.length
  ) {
    return NextResponse.json(
      { error: "Invalid poll selections" },
      { status: 400, headers: corsHeaders },
    );
  }

  const current = await loadPoll(auth.supabase, postId);
  if (current.error) {
    return NextResponse.json(
      { error: current.error.message },
      { status: 500, headers: corsHeaders },
    );
  }
  const poll = current.data as ForumPoll | null;
  if (!poll) {
    return NextResponse.json(
      { error: "Poll not found" },
      { status: 404, headers: corsHeaders },
    );
  }
  if (!poll.allowMultiple && optionIds.length !== 1) {
    return NextResponse.json(
      { error: "Select exactly one option" },
      { status: 400, headers: corsHeaders },
    );
  }
  const validOptionIds = new Set(poll.options.map((option) => option.id));
  if (optionIds.some((id) => !validOptionIds.has(id))) {
    return NextResponse.json(
      { error: "Invalid poll option" },
      { status: 400, headers: corsHeaders },
    );
  }

  const { error } = await auth.supabase.rpc("submit_forum_poll_vote", {
    p_poll_id: poll.id,
    p_option_ids: optionIds,
  });
  if (error) {
    return NextResponse.json(
      { error: error.message },
      {
        status:
          error.code === "22023" ? 400 : error.code === "42501" ? 403 : 500,
        headers: corsHeaders,
      },
    );
  }

  const updated = await loadPoll(auth.supabase, postId);
  if (updated.error) {
    return NextResponse.json(
      { error: updated.error.message },
      { status: 500, headers: corsHeaders },
    );
  }
  return NextResponse.json(
    { poll: updated.data as ForumPoll },
    { headers: corsHeaders },
  );
}

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: corsHeaders });
}
