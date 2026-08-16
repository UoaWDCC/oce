import type {
  CreateCommentFields,
  FormattedComment,
  Post,
  CreatePostFields,
  PostListItem,
  UpdateCommentFields,
  UpdatePostFields,
} from "@app-types/dao-forum";

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
  try {
    const body = (await res.json()) as { error?: string; message?: string };
    const message = body?.error ?? body?.message;
    if (typeof message === "string" && message.trim()) {
      return new Error(message);
    }
  } catch {
    // No JSON body to read; fall through to the status-based message.
  }
  return new Error(statusMessage(res.status));
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

// COMMENT ENDPOINTS
export async function getPostComments(
  daoGroupId: string,
  postId: string,
  sort = "oldest",
  token?: string,
) {
  const data = (await request(
    `/dao-forum/${daoGroupId}/posts/${postId}/comments?sort=${sort}`,
    {},
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

// LIKE ENDPOINTS
export async function likeComment(commentId: string, token?: string) {
  await request(`/comments/${commentId}/like`, { method: "POST" }, token);
  return true;
}

export async function unlikeComment(commentId: string, token?: string) {
  await request(`/comments/${commentId}/like`, { method: "DELETE" }, token);
  return true;
}
