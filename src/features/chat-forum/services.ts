import type {
  CreateCommentFields,
  FormattedComment,
  Post,
  CreatePostFields,
  PostListItem,
  UpdateCommentFields,
  UpdatePostFields,
  ForumPoll,
} from "@app-types/dao-forum";
import type { ForumCommentFilter } from "./types";

const NETWORK_ERROR_MESSAGE =
  "Couldn't reach the server. Check your connection and try again.";

function statusMessage(status: number) {
  if (status === 401 || status === 403) {
    return "Your session has expired. Sign in again and retry.";
  }
  if (status === 404) {
    return "That DAO forum could not be found. Refresh the page and try again.";
  }
  if (status === 429) {
    return "Too many requests. Wait a moment and try again.";
  }
  if (status >= 500) {
    return "The server ran into a problem. Your draft is safe — try again in a moment.";
  }
  return "Something went wrong. Your draft is safe — try again.";
}

/** Prefers the API's own error text, falling back to a message for the status code. */
async function errorFromResponse(res: Response) {
  let error: Error;
  try {
    const body = (await res.json()) as { error?: string; message?: string };
    const message = body?.error ?? body?.message;
    error =
      typeof message === "string" && message.trim()
        ? new Error(message)
        : new Error(statusMessage(res.status));
  } catch {
    // No JSON body to read; fall through to the status-based message.
    error = new Error(statusMessage(res.status));
  }
  (error as Error & { status?: number }).status = res.status;
  return error;
}

async function request(
  path: string,
  options: RequestInit = {},
  token?: string,
) {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw err;
    }
    // fetch only rejects when the request never reached the server.
    throw new Error(NETWORK_ERROR_MESSAGE);
  }

  if (!res.ok) {
    throw await errorFromResponse(res);
  }
  if (res.status === 204) {
    return null;
  }
  try {
    return await res.json();
  } catch {
    throw new Error("Invalid JSON response (400)");
  }
}

// POST ENDPOINTS
export async function getForumPosts(
  daoGroupId: string,
  token?: string,
  signal?: AbortSignal,
) {
  const data = (await request(
    `/dao-forum/${daoGroupId}/posts`,
    { signal },
    token,
  )) as PostListItem[];
  return data;
}

export async function getOnePost(
  daoGroupId: string,
  postId: string,
  token?: string,
) {
  const data = (await request(
    `/dao-forum/${daoGroupId}/posts/${postId}`,
    {},
    token,
  )) as Post;
  return data;
}

export async function createForumPost(
  daoGroupId: string,
  postData: CreatePostFields,
  token?: string,
) {
  let payload: string;
  try {
    payload = JSON.stringify(postData);
  } catch {
    throw new Error("Invalid post data (400)");
  }
  const data = (await request(
    `/dao-forum/${daoGroupId}/posts`,
    { method: "POST", body: payload },
    token,
  )) as Post;
  return data;
}

export async function updateForumPost(
  daoGroupId: string,
  postId: string,
  postData: UpdatePostFields,
  token?: string,
) {
  let payload: string;
  try {
    payload = JSON.stringify(postData);
  } catch {
    throw new Error("Invalid post data (400)");
  }
  const data = (await request(
    `/dao-forum/${daoGroupId}/posts/${postId}`,
    { method: "PATCH", body: payload },
    token,
  )) as Post;
  return data;
}

export async function deleteForumPost(
  daoGroupId: string,
  postId: string,
  token?: string,
) {
  await request(
    `/dao-forum/${daoGroupId}/posts/${postId}`,
    { method: "DELETE" },
    token,
  );
}

export async function getForumPoll(
  daoGroupId: string,
  postId: string,
  token?: string,
  signal?: AbortSignal,
) {
  const data = (await request(
    `/dao-forum/${daoGroupId}/posts/${postId}/poll`,
    { signal },
    token,
  )) as { poll: ForumPoll | null };
  return data.poll;
}

export async function submitForumPollVote(
  daoGroupId: string,
  postId: string,
  optionIds: string[],
  token?: string,
) {
  const data = (await request(
    `/dao-forum/${daoGroupId}/posts/${postId}/poll`,
    { method: "POST", body: JSON.stringify({ optionIds }) },
    token,
  )) as { poll: ForumPoll };
  return data.poll;
}

// COMMENT ENDPOINTS
export async function getPostComments(
  daoGroupId: string,
  postId: string,
  sort = "oldest",
  token?: string,
  signal?: AbortSignal,
  filter?: ForumCommentFilter,
) {
  const query = new URLSearchParams({ sort });
  if (filter && filter.reaction !== "all") {
    query.set("reaction", filter.reaction);
  }
  if (filter && filter.minCount > 0) {
    query.set("min_reactions", String(filter.minCount));
  }
  const data = (await request(
    `/dao-forum/${daoGroupId}/posts/${postId}/comments?${query}`,
    { signal },
    token,
  )) as FormattedComment[];
  return data;
}

export async function createPostComment(
  daoGroupId: string,
  postId: string,
  commentData: CreateCommentFields,
  token?: string,
) {
  const data = (await request(
    `/dao-forum/${daoGroupId}/posts/${postId}/comments`,
    { method: "POST", body: JSON.stringify(commentData) },
    token,
  )) as { comment: FormattedComment };
  return data.comment;
}

export async function updateForumComment(
  commentId: string,
  commentData: UpdateCommentFields,
  token?: string,
) {
  const data = (await request(
    `/comments/${commentId}`,
    { method: "PATCH", body: JSON.stringify(commentData) },
    token,
  )) as { comment: FormattedComment };
  return data.comment;
}

export async function deleteForumComment(commentId: string, token?: string) {
  await request(`/comments/${commentId}`, { method: "DELETE" }, token);
}

// COMMENT REACTION ENDPOINTS
export async function addCommentReaction(
  commentId: string,
  reactionType: "heart" | "thumbs_up" | "fire" | "thumbs_down",
  token?: string,
) {
  await request(
    `/comments/${commentId}/reaction/${reactionType}`,
    { method: "POST" },
    token,
  );
  return true;
}

export async function removeCommentReaction(
  commentId: string,
  reactionType: "heart" | "thumbs_up" | "fire" | "thumbs_down",
  token?: string,
) {
  await request(
    `/comments/${commentId}/reaction/${reactionType}`,
    { method: "DELETE" },
    token,
  );
  return true;
}
