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
