import { NextRequest, NextResponse } from "next/server";
import { authenticateUser } from "@/utils/authHelper";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const reactionTypes = ["heart", "thumbs_up", "fire", "thumbs_down"] as const;
type ReactionType = (typeof reactionTypes)[number];

function isReactionType(value: string): value is ReactionType {
  return reactionTypes.includes(value as ReactionType);
}

async function getAuthenticatedReactionContext(
  req: NextRequest,
  params: Promise<{ commentId: string; reactionType: string }>,
) {
  const { commentId, reactionType } = await params;

  if (!commentId) {
    return {
      response: NextResponse.json(
        { error: "Comment does not exist" },
        { status: 400, headers: corsHeaders },
      ),
    };
  }

  if (!isReactionType(reactionType)) {
    return {
      response: NextResponse.json(
        { error: "Invalid reaction type" },
        { status: 400, headers: corsHeaders },
      ),
    };
  }

  const auth = await authenticateUser(req, corsHeaders);
  if (auth.response) return { response: auth.response };

  return { ...auth, commentId, reactionType };
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ commentId: string; reactionType: string }> },
) {
  const context = await getAuthenticatedReactionContext(req, params);
  if (context.response) return context.response;

  const { supabase, user, commentId, reactionType } = context;
  const { data: comment, error: commentError } = await supabase
    .from("comments")
    .select("deleted_at")
    .eq("id", commentId)
    .maybeSingle();

  if (commentError || !comment || comment.deleted_at !== null) {
    return NextResponse.json(
      { error: "Comment not found" },
      { status: 404, headers: corsHeaders },
    );
  }

  const { data: existingReaction, error: reactionError } = await supabase
    .from("comment_reactions")
    .select("*")
    .eq("comment_id", commentId)
    .eq("user_id", user.id)
    .eq("reaction", reactionType)
    .maybeSingle();

  if (reactionError) {
    return NextResponse.json(
      { error: reactionError.message },
      { status: 500, headers: corsHeaders },
    );
  }

  if (existingReaction) {
    return NextResponse.json(
      {
        error: `You have already added a ${reactionType} reaction to this comment`,
      },
      { status: 409, headers: corsHeaders },
    );
  }

  const { data, error } = await supabase
    .from("comment_reactions")
    .insert({
      comment_id: commentId,
      user_id: user.id,
      reaction: reactionType,
    })
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500, headers: corsHeaders },
    );
  }

  return NextResponse.json(
    { reaction: data },
    { status: 201, headers: corsHeaders },
  );
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ commentId: string; reactionType: string }> },
) {
  const context = await getAuthenticatedReactionContext(req, params);
  if (context.response) return context.response;

  const { supabase, user, commentId, reactionType } = context;
  const { data: comment, error: commentError } = await supabase
    .from("comments")
    .select("deleted_at")
    .eq("id", commentId)
    .maybeSingle();

  if (commentError || !comment || comment.deleted_at !== null) {
    return NextResponse.json(
      { error: "Comment not found" },
      { status: 404, headers: corsHeaders },
    );
  }

  const { data: existingReaction, error: reactionError } = await supabase
    .from("comment_reactions")
    .select("*")
    .eq("comment_id", commentId)
    .eq("user_id", user.id)
    .eq("reaction", reactionType)
    .maybeSingle();

  if (reactionError) {
    return NextResponse.json(
      { error: reactionError.message },
      { status: 500, headers: corsHeaders },
    );
  }

  if (!existingReaction) {
    return NextResponse.json(
      {
        error: `You have not added a ${reactionType} reaction to this comment`,
      },
      { status: 404, headers: corsHeaders },
    );
  }

  const { error } = await supabase
    .from("comment_reactions")
    .delete()
    .eq("comment_id", commentId)
    .eq("user_id", user.id)
    .eq("reaction", reactionType);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500, headers: corsHeaders },
    );
  }

  return NextResponse.json(
    { message: `${reactionType} reaction removed` },
    { status: 200, headers: corsHeaders },
  );
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
}
