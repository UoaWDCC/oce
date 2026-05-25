import { NextRequest, NextResponse } from "next/server";
import { authenticateUser } from "@/utils/authHelper";
import { checkDAOMembership } from "@/utils/daoMembership";
import type { CreateCommentFields, InsertComment } from "@app-types/comments";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// POST - Create new comment
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ daoGroupId: string; postId: string }> },
) {
  try {
    const { daoGroupId, postId } = await params;

    if (!postId) {
      return NextResponse.json(
        { error: "Post does not exist" },
        { status: 400, headers: corsHeaders },
      );
    }

    const auth = await authenticateUser(req, corsHeaders);
    if (auth.response) return auth.response;
    const { supabase, user } = auth;

    const isDaoMember = await checkDAOMembership(supabase, user.id, daoGroupId);
    if (!isDaoMember) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403, headers: corsHeaders },
      );
    }

    const { data: parentPost, error: postError } = await supabase
      .from("posts")
      .select("deleted_at")
      .eq("id", postId)
      .eq("dao_group_id", daoGroupId)
      .maybeSingle();
    if (postError || !parentPost || parentPost.deleted_at !== null) {
      return NextResponse.json(
        { error: "Post not found" },
        { status: 404, headers: corsHeaders },
      );
    }

    let comment: CreateCommentFields;
    try {
      comment = (await req.json()) as CreateCommentFields;
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400, headers: corsHeaders },
      );
    }

    const { parent_comment_id, body, image_url } = comment;
    const parentCommentId =
      typeof parent_comment_id === "string"
        ? parent_comment_id.trim() || undefined
        : undefined;
    const bodyValue =
      typeof body === "string" ? body.trim() || undefined : undefined;
    const imageUrlValue =
      typeof image_url === "string" ? image_url.trim() || undefined : undefined;

    if (!bodyValue && !imageUrlValue) {
      return NextResponse.json(
        { error: "Comment cannot be empty" },
        { status: 400, headers: corsHeaders },
      );
    }

    if (parentCommentId) {
      const { data: parentComment, error: parentCommentError } = await supabase
        .from("comments")
        .select("deleted_at")
        .eq("id", parentCommentId)
        .eq("post_id", postId)
        .maybeSingle();

      if (
        parentCommentError ||
        !parentComment ||
        parentComment.deleted_at !== null
      ) {
        return NextResponse.json(
          { error: "Parent comment not found" },
          { status: 400, headers: corsHeaders },
        );
      }
    }

    const insertComment: InsertComment = {
      post_id: postId,
      author_id: user.id,
      parent_comment_id: parentCommentId,
      body: bodyValue,
      image_url: imageUrlValue,
    };

    const { data: newComment, error: insertError } = await supabase
      .from("comments")
      .insert(insertComment)
      .select()
      .single();

    if (insertError) throw insertError;

    return NextResponse.json(
      { success: true, comment: newComment },
      { status: 201, headers: corsHeaders },
    );
  } catch (error) {
    console.error("Error creating comment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: corsHeaders },
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
}
