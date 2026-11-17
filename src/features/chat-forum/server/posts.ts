import { POST_TYPE } from "../contracts";

export function postCapabilities(
  authorId: string | null | undefined,
  viewerId: string,
  viewerIsShaman = false,
) {
  const isAuthor = authorId === viewerId;
  return { isAuthor, canDelete: isAuthor || viewerIsShaman };
}

export function redactAnonymousPost<
  T extends { anonymous?: boolean; author_id?: string | null },
>(post: T, viewerId: string) {
  if (!post?.anonymous) return post;
  return {
    ...post,
    author_id: null,
    is_own_post: post.author_id === viewerId,
  };
}

export function validatePostFieldTypes(body: {
  post_type: unknown;
  anonymous?: unknown;
  is_pinned?: unknown;
  image_url?: unknown;
}): string | null {
  if (!Object.values(POST_TYPE).some((type) => type === body.post_type)) {
    return "Invalid post type";
  }
  if (
    (body.anonymous !== undefined && typeof body.anonymous !== "boolean") ||
    (body.is_pinned !== undefined && typeof body.is_pinned !== "boolean")
  ) {
    return "Anonymous and pinned flags must be booleans";
  }
  if (body.image_url != null && typeof body.image_url !== "string") {
    return "Image URL must be a string or null";
  }
  return null;
}
