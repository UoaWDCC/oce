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
  post_id: string,
) {
  const { data, error } = await supabase
    .from("posts")
    .select("dao_group_id")
    .eq("id", post_id)
    .single();
  if (error || !data) return false;

  const { data: member_data } = await supabase
    .from("dao_members")
    .select("user_id")
    .eq("dao_group_id", data.dao_group_id)
    .eq("user_id", user_id)
    .single();
  return !!member_data;
}

// POST - Create new comment
export async function POST(
  req: NextRequest,
  { params }: { params: { postId: string } },
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

    const isDaoMember = await checkDAOMembership(supabase, user.id, postId);
    if (!isDaoMember) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: corsHeaders },
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
      { headers: corsHeaders },
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
