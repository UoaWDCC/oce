import { ReactNode } from "react";

export interface ForumPost {
  id: string;
  daoId: string;
  title: string;
  body: string;
  authorId: string;
  createdAt: string;
}

export interface ForumComment {
  id: string;
  postId: string;
  body: string;
  authorId: string;
  createdAt: string;
}

export interface AuthorProfile {
  id: string;
  displayName: string;
  walletAddress: string | null;
  profileImageUrl: string | null;
  avatarColor: string | null;
  badges: ReactNode;
}

export type ForumPostType =
  | "Announcement"
  | "Proposal"
  | "Question"
  | "Discussion"
  | "Resource";

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
  types: ForumPostType[];
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
