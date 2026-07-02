import type { PostType } from "@app-types/post_types";

export interface ForumPostPreview {
  id: string;
  daoId: string;
  title: string;
  excerpt: string;
  authorName: string;
  authorWallet?: string;
  createdAt: string;
  createdAtLabel: string;
  commentCount: number;
  types: PostType[];
  tags: string[];
  isPinned?: boolean;
  isUnread?: boolean;
}

export interface ForumCommentPreview {
  id: string;
  postId: string;
  authorName: string;
  authorWallet?: string;
  body: string;
  createdAt: string;
  createdAtLabel: string;
  likeCount: number;
  isLiked?: boolean;
}
