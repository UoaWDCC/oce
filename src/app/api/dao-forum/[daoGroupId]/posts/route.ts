import { authenticateUser } from "@/utils/authHelper";
import { checkDAOMembership } from "@/utils/daoMembership";
import {
  hasMeaningfulForumContent,
  hasValidPostTitle,
  normalizePostTitle,
  trimTrailingEmptyParagraphs,
  forumContentToPlainText,
} from "@/utils/forumContent";
import type { CreatePostFields, PostListItem } from "@app-types/dao-forum";
import { NextRequest, NextResponse } from "next/server";
import { CONTENT_LIMITS } from "@/features/chat-forum/lib/contentLimits";
import { isPostUnread } from "@/features/chat-forum/readState";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

type RawPostListItem = Omit<
  PostListItem,
  "comment_count" | "view_count" | "is_unread" | "tags" | "author"
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

type CommentActivityRow = {
  post_id: string;
  created_at: string;
};

type ViewCountRow = {
  post_id: string;
  viewer_id: string;
  last_viewed_at: string;
};

function firstOrNull<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function formatPostListItem(
  post: RawPostListItem,
  commentCounts: Record<string, number>,
  viewCounts: Record<string, number>,
  unreadState: Record<string, boolean>,
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
    view_count: viewCounts[post.id] ?? 0,
    is_unread: unreadState[post.id] ?? true,
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
  const viewCounts: Record<string, number> = {};
  const unreadState: Record<string, boolean> = {};

  if (postIds.length > 0) {
    const { data: comments, error: commentsError } = await supabase
      .from("comments")
      .select("post_id, created_at")
      .is("deleted_at", null)
      .in("post_id", postIds);

    if (commentsError) {
      return NextResponse.json(
        { error: commentsError.message },
        { status: 500, headers: corsHeaders },
      );
    }

    const latestCommentCreatedAt: Record<string, string> = {};
    (comments as CommentActivityRow[] | null)?.forEach((comment) => {
      commentCounts[comment.post_id] =
        (commentCounts[comment.post_id] ?? 0) + 1;

      const currentLatest = latestCommentCreatedAt[comment.post_id];
      if (
        !currentLatest ||
        Date.parse(comment.created_at) > Date.parse(currentLatest)
      ) {
        latestCommentCreatedAt[comment.post_id] = comment.created_at;
      }
    });

    const { data: views, error: viewsError } = await supabase
      .from("post_views")
      .select("post_id, viewer_id, last_viewed_at")
      .in("post_id", postIds);

    if (viewsError) {
      return NextResponse.json(
        { error: viewsError.message },
        { status: 500, headers: corsHeaders },
      );
    }

    const distinctViewers: Record<string, Set<string>> = {};
    const currentUserLastViewedAt: Record<string, string> = {};
    (views as ViewCountRow[] | null)?.forEach((view) => {
      if (!distinctViewers[view.post_id]) {
        distinctViewers[view.post_id] = new Set();
      }
      distinctViewers[view.post_id].add(view.viewer_id);

      if (view.viewer_id === user.id) {
        const currentLatest = currentUserLastViewedAt[view.post_id];
        if (
          !currentLatest ||
          Date.parse(view.last_viewed_at) > Date.parse(currentLatest)
        ) {
          currentUserLastViewedAt[view.post_id] = view.last_viewed_at;
        }
      }
    });
    Object.entries(distinctViewers).forEach(([postId, viewers]) => {
      viewCounts[postId] = viewers.size;
    });

    posts.forEach((post) => {
      unreadState[post.id] = isPostUnread(
        currentUserLastViewedAt[post.id],
        latestCommentCreatedAt[post.id],
      );
    });
  }

  return NextResponse.json(
    posts.map((post) =>
      formatPostListItem(post, commentCounts, viewCounts, unreadState),
    ),
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

  if (
    !hasValidPostTitle(body.title) ||
    !hasMeaningfulForumContent(body.body) ||
    !body.post_type ||
    !daoGroupId
  ) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400, headers: corsHeaders },
    );
  }

  const errors: Record<string, string> = {};
  const normalizedTitle = normalizePostTitle(body.title);
  const normalizedBody = trimTrailingEmptyParagraphs(body.body);

  if (normalizedTitle.length > CONTENT_LIMITS.POST_TITLE) {
    errors.title = `Title must be ${CONTENT_LIMITS.POST_TITLE} characters or fewer`;
  }

  if (forumContentToPlainText(body.body).length > CONTENT_LIMITS.POST_BODY) {
    errors.body = `Body must be ${CONTENT_LIMITS.POST_BODY} characters or fewer`;
  }

  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ errors }, { status: 422, headers: corsHeaders });
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
      title: normalizedTitle,
      body: normalizedBody,
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
