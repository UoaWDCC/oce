import { NextRequest, NextResponse } from "next/server";
import { authenticateUser } from "@/utils/authHelper";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ commentId: string }> },
) {
  const { commentId } = await params;

  if (!commentId) {
    return NextResponse.json(
      { error: "Comment does not exist" },
      { status: 400, headers: corsHeaders },
    );
  }

  const auth = await authenticateUser(req, corsHeaders);
  if (auth.response) return auth.response;
  const { supabase, user } = auth;

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

  // Check if user already reacted to this comment
  const { data: existingReaction, error: reactionError } = await supabase
    .from("comment_reactions")
    .select("*")
    .eq("comment_id", commentId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (reactionError) {
    return NextResponse.json(
      { error: reactionError.message },
      { status: 500, headers: corsHeaders },
    );
  }

  if (existingReaction) {
    return NextResponse.json(
      { error: "You have already liked this comment" },
      { status: 409, headers: corsHeaders },
    );
  }

  // Insert reaction with default 'heart' reaction type
  const { data, error } = await supabase
    .from("comment_reactions")
    .insert({
      comment_id: commentId,
      user_id: user.id,
      reaction: "heart",
    })
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500, headers: corsHeaders },
    );
  }

  // Maintaining return object format for backward compatibility
  return NextResponse.json(
    { like: data },
    { status: 201, headers: corsHeaders },
  );
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ commentId: string }> },
) {
  const { commentId } = await params;

  if (!commentId) {
    return NextResponse.json(
      { error: "Comment does not exist" },
      { status: 400, headers: corsHeaders },
    );
  }

  const auth = await authenticateUser(req, corsHeaders);
  if (auth.response) return auth.response;
  const { supabase, user } = auth;

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
    .maybeSingle();

  if (reactionError) {
    return NextResponse.json(
      { error: reactionError.message },
      { status: 500, headers: corsHeaders },
    );
  }

  if (!existingReaction) {
    return NextResponse.json(
      { error: "You have not liked this comment" },
      { status: 404, headers: corsHeaders },
    );
  }

  // Delete all user reactions for this comment (unlikes the comment)
  const { error } = await supabase
    .from("comment_reactions")
    .delete()
    .eq("comment_id", commentId)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500, headers: corsHeaders },
    );
  }

  return NextResponse.json(
    { message: "Like removed" },
    { status: 200, headers: corsHeaders },
  );
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
}