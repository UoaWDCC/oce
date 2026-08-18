import { authenticateUser } from "@/utils/authHelper";
import {
  forumContentToPlainText,
  hasMeaningfulForumContent,
} from "@/utils/forumContent";
import type { Post, UpdatePostFields } from "@app-types/dao-forum";
import { NextResponse } from "next/server";
import { CONTENT_LIMITS } from "@/features/chat-forum/lib/contentLimits";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ daoGroupId: string; postId: string }> },
) {
  const { daoGroupId, postId } = await params;
  const auth = await authenticateUser(_request, corsHeaders);
  if (auth.response) return auth.response;
  const { supabase } = auth;

  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("dao_group_id", daoGroupId)
    .eq("id", postId)
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

  return NextResponse.json(data as Post, { headers: corsHeaders });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ daoGroupId: string; postId: string }> },
) {
  const { daoGroupId, postId } = await params;

  const auth = await authenticateUser(request, corsHeaders);
  if (auth.response) return auth.response;
  const { supabase, user } = auth;

  const body = (await request.json()) as UpdatePostFields;

  if (
    !body.title?.trim() ||
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
  const errors: Record<string, string> = {};

  if (body.title.length > CONTENT_LIMITS.POST_TITLE) {
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
    .select("id, author_id")
    .eq("id", postId)
    .eq("dao_group_id", daoGroupId)
    .single();

  if (postError || !post) {
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
      title: body.title,
      body: body.body,
      anonymous: body.anonymous,
      is_pinned: body.is_pinned,
      image_url: body.image_url,
    })
    .eq("dao_group_id", daoGroupId)
    .eq("id", postId)
    .select()
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500, headers: corsHeaders },
    );
  }

  return NextResponse.json(data, { status: 200, headers: corsHeaders });
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
    .select("id, author_id")
    .eq("id", postId)
    .eq("dao_group_id", daoGroupId)
    .single();

  if (postError || !post) {
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
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", postId)
    .eq("dao_group_id", daoGroupId)
    .eq("author_id", user.id)
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

  return NextResponse.json(data, { status: 200, headers: corsHeaders });
}
