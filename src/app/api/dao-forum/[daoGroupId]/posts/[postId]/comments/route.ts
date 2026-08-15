import { NextRequest, NextResponse } from "next/server";
import { authenticateUser } from "@/utils/authHelper";
import { checkDAOMembership } from "@/utils/daoMembership";
import { hasMeaningfulForumContent } from "@/utils/forumContent";
import { CONTENT_LIMITS } from "@/features/chat-forum/lib/contentLimits";
import type {
  CreateCommentFields,
  FormattedComment,
  InsertComment,
  RawComment,
} from "@app-types/dao-forum";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// POST - Create new comment
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ daoGroupId: string; postId: string }> },
) {
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

    // Validate comment length
  const errors: Record<string, string> = {};

  if (bodyValue && bodyValue.length > CONTENT_LIMITS.COMMENT_BODY) {
    errors.body = `Comment must be ${CONTENT_LIMITS.COMMENT_BODY} characters or fewer`;
  }

  if (Object.keys(errors).length > 0) {
    return NextResponse.json(
      { errors },
      { status: 422, headers: corsHeaders },
    );
  }

  if (bodyValue && !hasMeaningfulForumContent(bodyValue)) {
    return NextResponse.json(
      { error: "Comment body cannot be empty" },
      { status: 400, headers: corsHeaders },
    );
  }
  
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
    .select(
      `
        id,
        body,
        image_url,
        parent_comment_id,
        created_at,
        updated_at,
        deleted_at,
        author:AllowedUsers!author_id (
          id,
          username,
          FirstName,
          LastName
        )
      `,
    )
    .single();

  if (insertError) {
    return NextResponse.json(
      { error: insertError.message },
      { status: 500, headers: corsHeaders },
    );
  }

  const inserted = newComment as unknown as RawComment;

  const formattedComment: FormattedComment = {
    id: inserted.id,
    body: inserted.body,
    image_url: inserted.image_url,
    author_id: inserted.author?.id || user.id,
    username: inserted.author?.username || "",
    like_count: 0,
    is_liked: false,
    parent_comment_id: inserted.parent_comment_id,
    created_at: inserted.created_at,
    updated_at: inserted.updated_at,
  };

  return NextResponse.json(
    { success: true, comment: formattedComment },
    { status: 201, headers: corsHeaders },
  );
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ daoGroupId: string; postId: string }> },
) {
  const { daoGroupId, postId } = await params;
  const { searchParams } = new URL(req.url);
  const sort = searchParams.get("sort") || "oldest";

  if (sort !== "oldest" && sort !== "latest" && sort !== "most_likes") {
    return NextResponse.json(
      { error: "Invalid sort option" },
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

  const { data: post, error: postError } = await supabase
    .from("posts")
    .select("id, deleted_at")
    .eq("id", postId)
    .eq("dao_group_id", daoGroupId)
    .maybeSingle();

  if (postError || !post || post.deleted_at !== null) {
    return NextResponse.json(
      { error: "Post not found" },
      { status: 404, headers: corsHeaders },
    );
  }

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
        author:AllowedUsers!author_id (
          id,
          username,
          FirstName,
          LastName
        )
      `,
    )
    .eq("post_id", postId);

  if (commentsError) {
    return NextResponse.json(
      { error: commentsError.message },
      { status: 500, headers: corsHeaders },
    );
  }

  const commentIds = commentsData?.map((c) => c.id) || [];

  const { data: likeCounts, error: likeCountsError } = await supabase
    .from("comment_likes")
    .select("comment_id, user_id")
    .in("comment_id", commentIds);

  if (likeCountsError) {
    return NextResponse.json(
      { error: likeCountsError.message },
      { status: 500, headers: corsHeaders },
    );
  }

  if (!commentsData) {
    return NextResponse.json([], { headers: corsHeaders });
  }

  const comments = commentsData as unknown as RawComment[];
  const likeCountMap: Record<string, number> = {};
  likeCounts?.forEach((lc) => {
    likeCountMap[lc.comment_id] = (likeCountMap[lc.comment_id] || 0) + 1;
  });
  const likedByUser = new Set(
    likeCounts
      ?.filter((lc) => lc.user_id === user.id)
      .map((lc) => lc.comment_id),
  );

  const activeChildCounts: Record<string, number> = {};
  comments.forEach((comment) => {
    if (comment.parent_comment_id && !comment.deleted_at) {
      activeChildCounts[comment.parent_comment_id] =
        (activeChildCounts[comment.parent_comment_id] || 0) + 1;
    }
  });

  const filteredComments: FormattedComment[] = comments
    .filter((comment) => {
      if (!comment.deleted_at) return true;
      return (activeChildCounts[comment.id] || 0) > 0;
    })
    .map((comment) => ({
      id: comment.id,
      body: comment.deleted_at ? null : comment.body,
      image_url: comment.deleted_at ? null : comment.image_url,
      author_id: comment.author?.id || "",
      username: comment.author?.username || "",
      like_count: likeCountMap[comment.id] || 0,
      is_liked: likedByUser.has(comment.id),
      parent_comment_id: comment.parent_comment_id,
      created_at: comment.created_at,
      updated_at: comment.updated_at,
    }));

  const sortedComments = filteredComments.sort((a, b) => {
    if (sort === "latest") {
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }

    if (sort === "most_likes") {
      return b.like_count - a.like_count;
    }

    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  return NextResponse.json(sortedComments, { headers: corsHeaders });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
}
