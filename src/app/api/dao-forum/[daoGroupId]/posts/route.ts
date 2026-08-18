import { authenticateUser } from "@/utils/authHelper";
import { checkDAOMembership } from "@/utils/daoMembership";
import {
  hasMeaningfulForumContent,
  hasValidPostTitle,
  normalizePostTitle,
  trimTrailingEmptyParagraphs,
} from "@/utils/forumContent";
import type { CreatePostFields, PostListItem } from "@app-types/dao-forum";
import { NextRequest, NextResponse } from "next/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

type RawPostListItem = Omit<
  PostListItem,
  "comment_count" | "view_count" | "tags" | "author"
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

type ViewCountRow = {
  post_id: string;
  viewer_id: string;
};

function firstOrNull<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function formatPostListItem(
  post: RawPostListItem,
  commentCounts: Record<string, number>,
  viewCounts: Record<string, number>,
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
  const { supabase } = auth;

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

  if (postIds.length > 0) {
    const { data: comments, error: commentsError } = await supabase
      .from("comments")
      .select("post_id")
      .is("deleted_at", null)
      .in("post_id", postIds);

    if (commentsError) {
      return NextResponse.json(
        { error: commentsError.message },
        { status: 500, headers: corsHeaders },
      );
    }

    (comments as CommentCountRow[] | null)?.forEach((comment) => {
      commentCounts[comment.post_id] =
        (commentCounts[comment.post_id] ?? 0) + 1;
    });

    const { data: views, error: viewsError } = await supabase
      .from("post_views")
      .select("post_id, viewer_id")
      .in("post_id", postIds);

    if (viewsError) {
      return NextResponse.json(
        { error: viewsError.message },
        { status: 500, headers: corsHeaders },
      );
    }

    const distinctViewers: Record<string, Set<string>> = {};
    (views as ViewCountRow[] | null)?.forEach((view) => {
      if (!distinctViewers[view.post_id]) {
        distinctViewers[view.post_id] = new Set();
      }
      distinctViewers[view.post_id].add(view.viewer_id);
    });
    Object.entries(distinctViewers).forEach(([postId, viewers]) => {
      viewCounts[postId] = viewers.size;
    });
  }

  return NextResponse.json(
    posts.map((post) => formatPostListItem(post, commentCounts, viewCounts)),
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
      title: normalizePostTitle(body.title),
      body: trimTrailingEmptyParagraphs(body.body),
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
