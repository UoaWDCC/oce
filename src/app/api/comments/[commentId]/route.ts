import { NextRequest, NextResponse } from "next/server";
import { authenticateUser } from "@/utils/authHelper";
import type { UpdateCommentFields } from "@app-types/comments";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ commentId: string }> },
) {
  const { commentId } = await context.params;

  const auth = await authenticateUser(req, corsHeaders);
  if (auth.response) return auth.response;
  const { supabase, user } = auth;

  let json: UpdateCommentFields;
  try {
    json = (await req.json()) as UpdateCommentFields;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400, headers: corsHeaders },
    );
  }

  if (
    json.body !== undefined &&
    json.body !== null &&
    typeof json.body !== "string"
  ) {
    return NextResponse.json(
      { error: "Comment body must be a string or null" },
      { status: 400, headers: corsHeaders },
    );
  }

  if (
    json.image_url !== undefined &&
    json.image_url !== null &&
    typeof json.image_url !== "string"
  ) {
    return NextResponse.json(
      { error: "Image URL must be a string or null" },
      { status: 400, headers: corsHeaders },
    );
  }

  const updates: {
    body?: string | null;
    image_url?: string | null;
    updated_at: string;
  } = {
    updated_at: new Date().toISOString(),
  };

  if (json.body !== undefined) {
    updates.body = json.body === null ? null : json.body.trim();
  }

  if (json.image_url !== undefined) {
    updates.image_url = json.image_url === null ? null : json.image_url.trim();
  }

  if (updates.body === "") {
    return NextResponse.json(
      { error: "Comment body cannot be empty" },
      { status: 400, headers: corsHeaders },
    );
  }

  if (updates.image_url === "") {
    return NextResponse.json(
      { error: "Image URL cannot be empty" },
      { status: 400, headers: corsHeaders },
    );
  }

  if (json.body === undefined && json.image_url === undefined) {
    return NextResponse.json(
      { error: "No update fields provided" },
      { status: 400, headers: corsHeaders },
    );
  }

  const { data: comment, error: fetchError } = await supabase
    .from("comments")
    .select("id, author_id, post_id, body, image_url, deleted_at")
    .eq("id", commentId)
    .maybeSingle();

  if (fetchError || !comment) {
    return NextResponse.json(
      { error: "Comment not found" },
      { status: 404, headers: corsHeaders },
    );
  }

  if (comment.deleted_at !== null) {
    return NextResponse.json(
      { error: "Comment not found" },
      { status: 404, headers: corsHeaders },
    );
  }

  if (comment.author_id !== user.id) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403, headers: corsHeaders },
    );
  }

  const nextBody = updates.body !== undefined ? updates.body : comment.body;
  const nextImageUrl =
    updates.image_url !== undefined ? updates.image_url : comment.image_url;

  if (!nextBody && !nextImageUrl) {
    return NextResponse.json(
      { error: "Comment cannot be empty" },
      { status: 400, headers: corsHeaders },
    );
  }

  const { data: post, error: postError } = await supabase
    .from("posts")
    .select("id, deleted_at")
    .eq("id", comment.post_id)
    .maybeSingle();

  if (postError || !post || post.deleted_at !== null) {
    return NextResponse.json(
      { error: "Post not found" },
      { status: 404, headers: corsHeaders },
    );
  }

  const { data, error } = await supabase
    .from("comments")
    .update(updates)
    .eq("id", commentId)
    .eq("author_id", user.id)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message || "Failed to update comment" },
      { status: 500, headers: corsHeaders },
    );
  }

  return NextResponse.json({ comment: data }, { headers: corsHeaders });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
}
