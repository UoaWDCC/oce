import { POST_TYPE } from "../contracts";

export function postCapabilities(
  authorId: string | null | undefined,
  viewerId: string,
  viewerIsShaman = false,
) {
  const isAuthor = authorId === viewerId;
  return { isAuthor, canDelete: isAuthor || viewerIsShaman };
}

export function serializeForumPost<
  T extends { anonymous?: boolean; author_id?: string | null },
>(post: T, viewerId: string) {
  if (!post) return post;
  const data = { ...post };
  // Hide unused legacy database metadata from every post response.
  Reflect.deleteProperty(data, "is_pinned");
  if (!data.anonymous) return data;
  return {
    ...data,
    author_id: null,
    is_own_post: data.author_id === viewerId,
  };
}

export function validatePostFieldTypes(body: {
  post_type: unknown;
  anonymous?: unknown;
  image_url?: unknown;
}): string | null {
  if (!Object.values(POST_TYPE).some((type) => type === body.post_type)) {
    return "Invalid post type";
  }
  if (body.anonymous !== undefined && typeof body.anonymous !== "boolean") {
    return "Anonymous flag must be a boolean";
  }
  if (body.image_url != null && typeof body.image_url !== "string") {
    return "Image URL must be a string or null";
  }
  return null;
}
