import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { SupabaseClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Helper to check if user is a member of this DAO
async function checkDAOMembership(
  supabase: SupabaseClient,
  user_id: string,
  comment_id: string,
) {
  const { data: comment } = await supabase
    .from("comments")
    .select("post_id, deleted_at, like_count")
    .eq("id", comment_id)
    .single();
  if (!comment) return { isMember: false, comment: null };
  const { data: daoGroupId } = await supabase
    .from("posts")
    .select("dao_group_id")
    .eq("id", comment?.post_id)
    .single();
  const { data: daoMember } = await supabase
    .from("dao_members")
    .select("user_id")
    .eq("dao_group_id", daoGroupId?.dao_group_id)
    .eq("user_id", user_id)
    .single();

  return { isMember: !!daoMember, comment: comment };
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ commentId: string }> },
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

    const { commentId } = await params;

    if (!commentId) {
      return NextResponse.json(
        { error: "Comment does not exist" },
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

    const { isMember, comment } = await checkDAOMembership(
      supabase,
      user.id,
      commentId,
    );
    if (comment === null || comment?.deleted_at !== null) {
      return NextResponse.json(
        { error: "Comment not found" },
        { status: 404, headers: corsHeaders },
      );
    }
    if (!isMember) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403, headers: corsHeaders },
      );
    }
    const { data: updatedLikes, error: updateError } = await supabase
      .from("comments")
      .update({ like_count: comment?.like_count + 1 })
      .eq("id", commentId)
      .select("like_count")
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: "Like unsuccessful" },
        { status: 500, headers: corsHeaders },
      );
    }

    return NextResponse.json(
      { success: true, like_count: updatedLikes?.like_count },
      { status: 200, headers: corsHeaders },
    );
  } catch (error) {
    console.error("Error incrementing like", error);
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
