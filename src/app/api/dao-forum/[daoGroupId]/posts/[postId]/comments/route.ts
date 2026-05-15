import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

interface CommentAuthor {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
}

interface RawComment {
  id: string;
  body: string;
  image_url: string | null;
  parent_comment_id: string | null;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
  like_count: number;
  author: CommentAuthor | null;
}

interface FormattedComment {
  id: string;
  body: string | null;
  image_url: string | null;
  author_id: string;
  username: string;
  like_count: number;
  parent_comment_id: string | null;
  created_at: string;
  updated_at: string | null;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ daoGroupId: string; postId: string }> }
) {
  try {
    // Extract parameters
    const { daoGroupId, postId } = await params;
    const { searchParams } = new URL(req.url);
    const sort = searchParams.get("sort") || "oldest";

    // Extract Bearer token from Authorization header
    const accessToken = req.headers
      .get("Authorization")
      ?.replace("Bearer ", "");

    if (!accessToken) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: corsHeaders }
      );
    }

    // Verify user authentication
    const supabase = await createClient(accessToken);
    const {
      data: { user },
      error: sessionError,
    } = await supabase.auth.getUser();

    if (sessionError || !user) {
      return NextResponse.json(
        { error: "Invalid auth token" },
        { status: 401, headers: corsHeaders }
      );
    }

    // Verify post exists and belongs to the specified DAO group
    const { data: post, error: postError } = await supabase
      .from("posts")
      .select("id, dao_group_id, deleted_at")
      .eq("id", postId)
      .eq("dao_group_id", daoGroupId)
      .single();

    if (postError || !post) {
      return NextResponse.json(
        { error: "Post not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    if (post.deleted_at) {
      return NextResponse.json(
        { error: "Post not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    // Check if user is a member of this DAO
    const { data: membership, error: membershipError } = await supabase
      .from("dao_members")
      .select("user_id")
      .eq("dao_group_id", daoGroupId)
      .eq("user_id", user.id)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403, headers: corsHeaders }
      );
    }

    // Fetch all comments with author data
    const { data: commentsData, error: commentsError } = await supabase
      .from("comments")
      .select(
        `
        id,
        body,
        image_url,
        parent_comment_id,
        created_at,
        updated_at,
        deleted_at,
        like_count,
        author:allowed_users!author_id (
          id,
          username,
          first_name,
          last_name
        )
      `
      )
      .eq("post_id", postId);

    if (commentsError) {
      console.error("Error fetching comments:", commentsError);
      return NextResponse.json(
        { error: "Failed to fetch comments" },
        { status: 500, headers: corsHeaders }
      );
    }

    if (!commentsData) {
      return NextResponse.json([], { headers: corsHeaders });
    }

    // Cast to the proper type (Supabase joins return complex types)
    const comments = commentsData as unknown as RawComment[];

    // Build map of parent_id -> active child count for soft-delete logic
    const activeChildCounts: Record<string, number> = {};
    comments.forEach((c) => {
      if (c.parent_comment_id && !c.deleted_at) {
        activeChildCounts[c.parent_comment_id] =
          (activeChildCounts[c.parent_comment_id] || 0) + 1;
      }
    });

    // Filter and transform comments
    const filteredComments: FormattedComment[] = comments
      .filter((c) => {
        // If not deleted, include it
        if (!c.deleted_at) return true;
        // If deleted but has active children, include it
        return (activeChildCounts[c.id] || 0) > 0;
      })
      .map((c) => {
        return {
          id: c.id,
          body: c.deleted_at ? null : c.body,
          image_url: c.deleted_at ? null : c.image_url,
          author_id: c.author?.id || "",
          username: c.author?.username || "",
          like_count: c.like_count || 0,
          parent_comment_id: c.parent_comment_id,
          created_at: c.created_at,
          updated_at: c.updated_at,
        };
      });

    // Apply sorting
    let sortedComments = filteredComments;
    if (sort === "latest") {
      sortedComments = filteredComments.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    } else if (sort === "most_likes") {
      sortedComments = filteredComments.sort(
        (a, b) => b.like_count - a.like_count
      );
    } else {
      // oldest or default
      sortedComments = filteredComments.sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    }

    return NextResponse.json(sortedComments, { headers: corsHeaders });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
}
