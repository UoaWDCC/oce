import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { SupabaseClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface CommentBody {
  body?: string;
  image_url?: string;
  parent_comment_id?: string;
}

interface InsertComment {
  post_id: string;
  author_id: string;
  parent_comment_id?: string;
  body?: string;
  image_url?: string;
}

// Helper to check if user is a member of this DAO
async function checkDAOMembership(
  supabase: SupabaseClient,
  user_id: string,
  daoGroupId: string,
) {
  const { data: member_data } = await supabase
    .from("dao_members")
    .select("user_id")
    .eq("dao_group_id", daoGroupId)
    .eq("user_id", user_id)
    .single();
  return !!member_data;
}

// POST - Create new comment
export async function POST(
  req: NextRequest,
  { params }: { params: { daoGroupId: string, postId: string } },
) {
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

    const postId = params.postId;

    if (!postId) {
      return NextResponse.json(
        { error: "Post does not exist" },
        { status: 400, headers: corsHeaders },
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

    const daoGroupId = params.daoGroupId;
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
      .single();
    if ( postError || !parentPost || parentPost.deleted_at !== null) {
      return NextResponse.json(
        { error: "Post not found" },
        { status: 404, headers: corsHeaders },
      );
    }

    const comment = (await req.json()) as CommentBody;
    const { parent_comment_id, body, image_url } = comment;

    if (!body && !image_url) {
      return NextResponse.json(
        { error: "Comment cannot be empty" },
        { status: 400, headers: corsHeaders },
      );
    }

    if (parent_comment_id) {
      const { data: parentComment, error: parentCommentNotFound } = await supabase
        .from("comments")
        .select("deleted_at")
        .eq("id", parent_comment_id)
        .eq("post_id", postId)
        .single();
      
      if ( parentCommentNotFound || !parentComment || parentComment.deleted_at !== null ) {
        return NextResponse.json(
          { error: "Parent comment not found" },
          { status: 400, headers: corsHeaders },
        );
      }
    }

    const insertComment: InsertComment = {
      post_id: postId,
      author_id: user.id,
      parent_comment_id,
      body,
      image_url,
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
