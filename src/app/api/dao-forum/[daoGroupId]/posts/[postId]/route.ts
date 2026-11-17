import {
  postCapabilities,
  redactAnonymousPost,
  validatePostFieldTypes,
} from "@/features/chat-forum/server/posts";
import {
  forumCorsHeaders,
  readForumJson,
} from "@/features/chat-forum/server/http";
import { authenticateUser } from "@/utils/authHelper";
import { isDaoShaman } from "@/features/chat-forum/daoShaman";
import {
  hasMeaningfulForumContent,
  hasValidPostTitle,
  normalizePostTitle,
  trimTrailingEmptyParagraphs,
  forumContentToPlainText,
} from "@/features/chat-forum/lib/content";
import type { Post, UpdatePostFields } from "@app-types/dao-forum";
import { NextResponse } from "next/server";
import { CONTENT_LIMITS } from "@/features/chat-forum/lib/contentLimits";

const corsHeaders = forumCorsHeaders("GET, PATCH, DELETE, OPTIONS");

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ daoGroupId: string; postId: string }> },
) {
  const { daoGroupId, postId } = await params;
  const auth = await authenticateUser(_request, corsHeaders);
  if (auth.response) return auth.response;
  const { supabase, user } = auth;

  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("dao_group_id", daoGroupId)
    .is("deleted_at", null)
    .eq("id", postId)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500, headers: corsHeaders },
    );
  }

  if (!data || data.deleted_at) {
    return NextResponse.json(
      { error: "Post not found" },
      { status: 404, headers: corsHeaders },
    );
  }

  return NextResponse.json(redactAnonymousPost(data as Post, user.id), {
    headers: corsHeaders,
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ daoGroupId: string; postId: string }> },
) {
  const { daoGroupId, postId } = await params;

  const auth = await authenticateUser(request, corsHeaders);
  if (auth.response) return auth.response;
  const { supabase, user } = auth;

  const parsed = await readForumJson<UpdatePostFields>(request, corsHeaders);
  if (parsed.response) return parsed.response;
  const body = parsed.data;

  if (
    !hasValidPostTitle(body.title) ||
    !hasMeaningfulForumContent(body.body) ||
    !body.post_type ||
    body.anonymous === undefined ||
    body.is_pinned === undefined
  ) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400, headers: corsHeaders },
    );
  }

  // Validate input fields
  const fieldError = validatePostFieldTypes(body);
  if (fieldError)
    return NextResponse.json(
      { error: fieldError },
      { status: 400, headers: corsHeaders },
    );

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

  const { data: post, error: postError } = await supabase
    .from("posts")
    .select("id, author_id, deleted_at")
    .eq("id", postId)
    .eq("dao_group_id", daoGroupId)
    .is("deleted_at", null)
    .single();

  if (postError || !post || post.deleted_at) {
    return NextResponse.json(
      { error: "Post not found" },
      { status: 404, headers: corsHeaders },
    );
  }

  if (post.author_id !== user.id) {
    return NextResponse.json(
      { error: "Unauthorized, you are not the author of this post" },
      { status: 403, headers: corsHeaders },
    );
  }

  const { data, error } = await supabase
    .from("posts")
    .update({
      post_type: body.post_type,
      title: normalizedTitle,
      body: normalizedBody,
      anonymous: body.anonymous,
      is_pinned: body.is_pinned,
      image_url: body.image_url,
    })
    .eq("dao_group_id", daoGroupId)
    .is("deleted_at", null)
    .eq("id", postId)
    .select()
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500, headers: corsHeaders },
    );
  }

  if (!data) {
    return NextResponse.json(
      { error: "Post not found" },
      { status: 404, headers: corsHeaders },
    );
  }

  return NextResponse.json(redactAnonymousPost(data, user.id), {
    status: 200,
    headers: corsHeaders,
  });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ daoGroupId: string; postId: string }> },
) {
  const { daoGroupId, postId } = await params;

  const auth = await authenticateUser(request, corsHeaders);
  if (auth.response) return auth.response;
  const { supabase, user } = auth;

  const { data: post, error: postError } = await supabase
    .from("posts")
    .select("id, author_id, deleted_at")
    .eq("id", postId)
    .eq("dao_group_id", daoGroupId)
    .is("deleted_at", null)
    .single();

  if (postError || !post || post.deleted_at) {
    return NextResponse.json(
      { error: "Post not found" },
      { status: 404, headers: corsHeaders },
    );
  }

  const isAuthor = post.author_id === user.id;
  const isShaman = isAuthor
    ? false
    : await isDaoShaman(supabase, user.id, daoGroupId);

  if (!postCapabilities(post.author_id, user.id, isShaman).canDelete) {
    return NextResponse.json(
      {
        error:
          "Unauthorized, you are not the author of this post or a shaman of this DAO",
      },
      { status: 403, headers: corsHeaders },
    );
  }

  const { data, error } = await supabase
    .from("posts")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", postId)
    .eq("dao_group_id", daoGroupId)
    .is("deleted_at", null)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500, headers: corsHeaders },
    );
  }

  if (!data) {
    return NextResponse.json(
      { error: "Post not found or unauthorized" },
      { status: 404, headers: corsHeaders },
    );
  }

  return NextResponse.json(redactAnonymousPost(data, user.id), {
    status: 200,
    headers: corsHeaders,
  });
}
