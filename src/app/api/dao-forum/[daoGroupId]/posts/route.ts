import { authenticateUser } from "@/utils/authHelper";
import { checkDAOMembership } from "@/utils/daoMembership";
import type { CreatePostFields, PostListItem } from "@app-types/dao-forum";
import { NextRequest, NextResponse } from "next/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

type RawPostListItem = Omit<
  PostListItem,
  "comment_count" | "tags" | "author" | "is_unread"
> & {
  author:
    | {
        id: string;
        username: string | null;
        FirstName: string | null;
        LastName: string | null;
        Name: string | null;
      }
    | {
        id: string;
        username: string | null;
        FirstName: string | null;
        LastName: string | null;
        Name: string | null;
      }[]
    | null;
  post_tags:
    | {
        tag:
          | {
              name: string;
            }
          | {
              name: string;
            }[]
          | null;
      }[]
    | null;
};

type CommentCountRow = {
  post_id: string;
};

type CommentWithTimestamp = {
  post_id: string;
  created_at: string;
  updated_at: string | null;
};

type PostViewRow = {
  post_id: string;
  last_viewed_at: string;
};

function firstOrNull<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function formatPostListItem(
  post: RawPostListItem,
  commentCounts: Record<string, number>,
  isUnread: Record<string, boolean>,
): PostListItem {
  return {
    id: post.id,
    dao_group_id: post.dao_group_id,
    author_id: post.author_id,
    post_type: post.post_type,
    title: post.title,
    body: post.body,
    anonymous: post.anonymous,
    is_pinned: post.is_pinned,
    image_url: post.image_url,
    created_at: post.created_at,
    updated_at: post.updated_at,
    comment_count: commentCounts[post.id] ?? 0,
    is_unread: isUnread[post.id] ?? true,
    author: post.anonymous ? null : firstOrNull(post.author),
    tags:
      post.post_tags
        ?.flatMap((postTag) => {
          const tag = firstOrNull(postTag.tag);
          return tag?.name ? [tag.name] : [];
        })
        .sort((left, right) => left.localeCompare(right)) ?? [],
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ daoGroupId: string }> },
) {
  const { daoGroupId } = await params;

  const auth = await authenticateUser(_request, corsHeaders);
  if (auth.response) return auth.response;
  const { supabase, user } = auth;

  const { data, error } = await supabase
    .from("posts")
    .select(
      `
        id,
        dao_group_id,
        author_id,
        post_type,
        title,
        body,
        anonymous,
        is_pinned,
        image_url,
        created_at,
        updated_at,
        author:AllowedUsers!posts_new_author_fk (
          id,
          username,
          FirstName,
          LastName,
          Name
        ),
        post_tags (
          tag:tags!post_tags_new_tag_fk (
            name
          )
        )
      `,
    )
    .eq("dao_group_id", daoGroupId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500, headers: corsHeaders },
    );
  }

  const posts = (data ?? []) as unknown as RawPostListItem[];
  const postIds = posts.map((post) => post.id);
  const commentCounts: Record<string, number> = {};
  const isUnread: Record<string, boolean> = {};

  if (postIds.length > 0) {
    // Fetch comments with timestamps for count and latest activity
    const { data: comments, error: commentsError } = await supabase
      .from("comments")
      .select("post_id, created_at, updated_at")
      .is("deleted_at", null)
      .in("post_id", postIds);

    if (commentsError) {
      return NextResponse.json(
        { error: commentsError.message },
        { status: 500, headers: corsHeaders },
      );
    }

    // Calculate comment counts and track latest comment timestamps
    const latestCommentActivity: Record<string, Date> = {};
    (comments as CommentWithTimestamp[] | null)?.forEach((comment) => {
      commentCounts[comment.post_id] = (commentCounts[comment.post_id] ?? 0) + 1;

      const commentTime = new Date(comment.updated_at ?? comment.created_at);
      if (
        !latestCommentActivity[comment.post_id] ||
        commentTime > latestCommentActivity[comment.post_id]
      ) {
        latestCommentActivity[comment.post_id] = commentTime;
      }
    });

    // Fetch user's post views
    const { data: postViews, error: viewsError } = await supabase
      .from("post_views")
      .select("post_id, last_viewed_at")
      .eq("viewer_id", user.id)
      .in("post_id", postIds);

    if (viewsError) {
      return NextResponse.json(
        { error: viewsError.message },
        { status: 500, headers: corsHeaders },
      );
    }

    const userPostViews: Record<string, Date> = {};
    (postViews as PostViewRow[] | null)?.forEach((view) => {
      userPostViews[view.post_id] = new Date(view.last_viewed_at);
    });

    // Calculate is_unread for each post
    posts.forEach((post) => {
      const lastViewed = userPostViews[post.id];

      // If never viewed, it's unread
      if (!lastViewed) {
        isUnread[post.id] = true;
        return;
      }

      // Determine latest activity (post or comments)
      const postActivity = new Date(post.updated_at ?? post.created_at);
      const latestComment = latestCommentActivity[post.id];
      const latestActivity = latestComment
        ? new Date(Math.max(postActivity.getTime(), latestComment.getTime()))
        : postActivity;

      // Unread if activity is newer than last view
      isUnread[post.id] = latestActivity > lastViewed;
    });
  }

  return NextResponse.json(
    posts.map((post) => formatPostListItem(post, commentCounts, isUnread)),
    { headers: corsHeaders },
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ daoGroupId: string }> },
) {
  const { daoGroupId } = await params;

  const auth = await authenticateUser(request, corsHeaders);
  if (auth.response) return auth.response;
  const { supabase, user } = auth;

  const body = (await request.json()) as CreatePostFields;

  if (!body.title || !body.body || !body.post_type || !daoGroupId) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400, headers: corsHeaders },
    );
  }

  const isDaoMember = await checkDAOMembership(supabase, user.id, daoGroupId);
  if (!isDaoMember) {
    return NextResponse.json(
      { error: "User is not a member of the specified DAO group" },
      { status: 403, headers: corsHeaders },
    );
  }

  const { data, error } = await supabase
    .from("posts")
    .insert({
      post_type: body.post_type,
      title: body.title,
      body: body.body,
      anonymous: body.anonymous,
      is_pinned: body.is_pinned,
      image_url: body.image_url,
      author_id: user.id,
      dao_group_id: daoGroupId,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Conflict with existing state" },
        { status: 409, headers: corsHeaders },
      );
    }
    return NextResponse.json(
      { error: error.message },
      { status: 500, headers: corsHeaders },
    );
  }
  return NextResponse.json(data, { status: 201, headers: corsHeaders });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
}
