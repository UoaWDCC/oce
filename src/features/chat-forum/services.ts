import {
  CreateCommentFields,
  FormattedComment,
  UpdateCommentFields,
} from "@app-types/comments";
import {
  Post,
  CreatePostFields,
  PostListItem,
  UpdatePostFields,
} from "@app-types/posts";

async function request(
  path: string,
  options: RequestInit = {},
  token?: string,
) {
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    throw new Error(res.statusText);
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
export async function getForumPosts(daoGroupId: string, token?: string) {
  const data = (await request(
    `/dao-forum/${daoGroupId}/posts`,
    {},
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
