import { NextRequest, NextResponse } from "next/server";
import { authenticateUser } from "@/utils/authHelper";
import { checkDAOMembership } from "@/utils/daoMembership";
import {
  hasMeaningfulForumContent,
  trimTrailingEmptyParagraphs,
  forumContentToPlainText,
} from "@/utils/forumContent";
import { CONTENT_LIMITS } from "@/features/chat-forum/lib/contentLimits";
import type {
  CreateCommentFields,
  FormattedComment,
  InsertComment,
  RawComment,
  ReactionCounts,
  ReactionType,
  UserReactions,
} from "@app-types/dao-forum";
import { loadDaoAuthorIdentities } from "@/features/chat-forum/authorIdentity";
import {
  REACTION_FILTER_TYPES,
  compareComments,
  filterCommentsWithAncestors,
  parseCommentSort,
  parseMinReactions,
  parseReactionFilterType,
} from "@/features/chat-forum/lib/commentReactions";

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
    typeof body === "string"
      ? trimTrailingEmptyParagraphs(body.trim()) || undefined
      : undefined;
  const imageUrlValue =
    typeof image_url === "string" ? image_url.trim() || undefined : undefined;

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

  if (
    bodyValue &&
    forumContentToPlainText(bodyValue).length > CONTENT_LIMITS.COMMENT_BODY
  ) {
    return NextResponse.json(
      {
        errors: {
          body: `Comment must be ${CONTENT_LIMITS.COMMENT_BODY} characters or fewer`,
        },
      },
      { status: 422, headers: corsHeaders },
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
  const identities = await loadDaoAuthorIdentities(supabase, [
    inserted.author?.id || user.id,
  ]);
  const identity = identities[inserted.author?.id || user.id];

  const formattedComment: FormattedComment = {
    id: inserted.id,
    body: inserted.body,
    image_url: inserted.image_url,
    author_id: inserted.author?.id || user.id,
    username: inserted.author?.username || "",
    wallet_address: identity?.walletAddress ?? null,
    ens_name: identity?.ensName ?? null,
    reaction_counts: {
      heart: 0,
      thumbs_up: 0,
      fire: 0,
      thumbs_down: 0,
    },
    user_reactions: {
      heart: false,
      thumbs_up: false,
      fire: false,
      thumbs_down: false,
    },
    parent_comment_id: inserted.parent_comment_id,
    created_at: inserted.created_at,
    updated_at: inserted.updated_at,
    deleted_at: inserted.deleted_at,
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
  const sort = parseCommentSort(searchParams.get("sort"));
  const reaction = parseReactionFilterType(searchParams.get("reaction"));
  const minCount = parseMinReactions(searchParams.get("min_reactions"));

  if (sort === null) {
    return NextResponse.json(
      { error: "Invalid sort option" },
      { status: 400, headers: corsHeaders },
    );
  }

  if (reaction === null) {
    return NextResponse.json(
      {
        error: `Invalid reaction filter. Use one of: ${REACTION_FILTER_TYPES.join(", ")}`,
      },
      { status: 400, headers: corsHeaders },
    );
  }

  if (minCount === null) {
    return NextResponse.json(
      { error: "min_reactions must be a whole number of 0 or more" },
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

  if (!commentsData) {
    return NextResponse.json([], { headers: corsHeaders });
  }

  const commentIds = commentsData.map((c) => c.id);

  // 1. Add "reaction" to your select statement
  const { data: reactionsData, error: reactionsError } = await supabase
    .from("comment_reactions")
    .select("comment_id, user_id, reaction") // <--- Added reaction here
    .in("comment_id", commentIds);

  if (reactionsError) {
    return NextResponse.json(
      { error: reactionsError.message },
      { status: 500, headers: corsHeaders },
    );
  }

  const comments = commentsData as unknown as RawComment[];

  const reactionCountsMap: Record<string, ReactionCounts> = {};
  reactionsData?.forEach((reaction) => {
    const counts = reactionCountsMap[reaction.comment_id] ?? {
      heart: 0,
      thumbs_up: 0,
      fire: 0,
      thumbs_down: 0,
    };
    counts[reaction.reaction as ReactionType] += 1;
    reactionCountsMap[reaction.comment_id] = counts;
  });

  const userReactionsMap: Record<string, UserReactions> = {};
  reactionsData?.forEach((reaction) => {
    if (reaction.user_id !== user.id) return;
    const reactions = userReactionsMap[reaction.comment_id] ?? {
      heart: false,
      thumbs_up: false,
      fire: false,
      thumbs_down: false,
    };
    reactions[reaction.reaction as ReactionType] = true;
    userReactionsMap[reaction.comment_id] = reactions;
  });

  const commentsWithCounts = comments.map((comment) => ({
    ...comment,
    reaction_counts: reactionCountsMap[comment.id] ?? {
      heart: 0,
      thumbs_up: 0,
      fire: 0,
      thumbs_down: 0,
    },
  }));

  // Deleted comments stay only as ancestors of a kept reply, so a reply is
  // never orphaned. Comments outside the reaction filter are kept the same
  // way, flagged as context.
  const visibleComments = filterCommentsWithAncestors(commentsWithCounts, {
    reaction,
    minCount,
  });

  const identities = await loadDaoAuthorIdentities(
    supabase,
    visibleComments.filter((c) => !c.deleted_at).map((c) => c.author?.id),
  );

  const formattedComments: FormattedComment[] = visibleComments.map(
    (comment) => {
      const identity = comment.author?.id
        ? identities[comment.author.id]
        : undefined;
      return {
        id: comment.id,
        body: comment.deleted_at ? null : comment.body,
        image_url: comment.deleted_at ? null : comment.image_url,
        author_id: comment.author?.id || "",
        username: comment.author?.username || "",
        wallet_address: comment.deleted_at
          ? null
          : (identity?.walletAddress ?? null),
        ens_name: comment.deleted_at ? null : (identity?.ensName ?? null),
        reaction_counts: comment.reaction_counts,
        user_reactions: userReactionsMap[comment.id] ?? {
          heart: false,
          thumbs_up: false,
          fire: false,
          thumbs_down: false,
        },
        parent_comment_id: comment.parent_comment_id,
        created_at: comment.created_at,
        updated_at: comment.updated_at,
        deleted_at: comment.deleted_at,
        is_context_only: comment.is_context_only,
      };
    },
  );

  // Replies are nested by the client in the order returned here, so sorting
  // the flat list sorts every set of siblings.
  const sortedComments = formattedComments.sort(compareComments(sort));

  return NextResponse.json(sortedComments, { headers: corsHeaders });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
}
