import { CreateCommentFields, FormattedComment, UpdateCommentFields } from "@app-types/comments";
import { Post, CreatePostFields, PostSummary, UpdatePostFields } from "@app-types/posts";

async function request(path: string, options: RequestInit = {}, token?: string) {
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

  return res.status === 204 ? null : res.json();
}

function normalisePost(p: Post) {
  return {
    id: p.id,
    daoGroupId: p.dao_group_id,
    authorId: p.author_id,
    postTypeId: p.post_type_id,
    title: p.title,
    body: p.body,
    anonymous: p.anonymous,
    isPinned: p.is_pinned,
    imageUrl: p.image_url,
    createdAt: p.created_at,
    deletedAt: p.deleted_at,
  };
}

function normalisePostSummary(p: PostSummary) {
  return {
    id: p.id,
    authorId: p.author_id,
    postTypeId: p.post_type_id,
    title: p.title,
    anonymous: p.anonymous,
    isPinned: p.is_pinned,
    createdAt: p.created_at,
    deletedAt: p.deleted_at,
  };
}
 
function normaliseComment(c: FormattedComment) {
  return {
    id: c.id,
    body: c.body,
    imageUrl: c.image_url,
    authorId: c.author_id,
    username: c.username,
    likeCount: c.like_count,
    isLiked: c.is_liked,
    parentCommentId: c.parent_comment_id,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  };
}

// POST ENDPOINTS
export async function getForumPosts(daoGroupId: string, token?: string) {
  const data = await request(`/dao-groups/${daoGroupId}/posts`, {}, token) as PostSummary[];
  return data.map(normalisePostSummary);
}

export async function getOnePost(daoGroupId: string, postId: string, token?: string) {
  const data = await request(`/dao-groups/${daoGroupId}/posts/${postId}`, {}, token) as Post;
  return normalisePost(data);
}

export async function createForumPost(daoGroupId: string, postData: CreatePostFields, token?: string) {
  const data = await request(`/dao-groups/${daoGroupId}/posts`, { method: "POST", body: JSON.stringify(postData) }, token) as Post;
  return normalisePost(data);
}

export async function updateForumPost(daoGroupId: string, postId: string, postData: UpdatePostFields, token?: string) {
  const data = await request(`/dao-groups/${daoGroupId}/posts/${postId}`, { method: "PATCH", body: JSON.stringify(postData) }, token) as Post;
  return normalisePost(data);
}

export async function deleteForumPost(daoGroupId: string, postId: string, token?: string) {
  await request(`/dao-groups/${daoGroupId}/posts/${postId}`, { method: "DELETE" }, token);
}

// COMMENT ENDPOINTS
export async function getPostComments(daoGroupId: string, postId: string, sort = "oldest", token?: string) {
  const data = await request(`/dao-groups/${daoGroupId}/posts/${postId}/comments?sort=${sort}`, {}, token) as FormattedComment[];
  return data.map(normaliseComment);
}

export async function createPostComment(daoGroupId: string, postId: string, commentData: CreateCommentFields, token?: string) {
  const data = await request(`/dao-groups/${daoGroupId}/posts/${postId}/comments`, { method: "POST", body: JSON.stringify(commentData) }, token) as { comment: FormattedComment };
  return normaliseComment(data.comment as FormattedComment);
}

export async function updateForumComment(commentId: string, commentData: UpdateCommentFields, token?: string) {
  const data = await request(`/comments/${commentId}`, { method: "PATCH", body: JSON.stringify(commentData) }, token) as { comment: FormattedComment };
  return normaliseComment(data.comment as FormattedComment);
}

export async function deleteForumComment(commentId: string, token?: string) {
  await request(`/comments/${commentId}`, { method: "DELETE" }, token);
}

// LIKE ENDPOINTS
export async function likeComment(commentId: string, token?: string) {
  await request(`/comments/${commentId}/likes`, { method: "POST" }, token);
  return true;
}

export async function unlikeComment(commentId: string, token?: string) {
  await request(`/comments/${commentId}/likes`, { method: "DELETE" }, token);
  return true;
}