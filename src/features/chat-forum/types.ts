import type { PostType } from "@app-types/dao-forum";

export type {
  ForumCommentPreview,
  ForumPostPreview,
} from "@app-types/dao-forum";

export type ForumThreadSort = "oldest" | "latest" | "most_likes";

export type ForumThreadAuthor = {
  name: string;
  walletAddress?: string;
  profileImageUrl?: string;
  avatarColor?: string;
  badges?: string[];
  isEndorsed?: boolean;
};

export type ForumThreadPost = {
  id: string;
  title: string;
  body: string;
  postType?: PostType | null;
  tags: string[];
  author: ForumThreadAuthor;
  createdAt: string;
  createdAtLabel: string;
  statusLabel?: string;
};

export type ForumThreadComment = {
  id: string;
  body: string;
  author: ForumThreadAuthor;
  createdAt: string;
  createdAtLabel: string;
  likeCount: number;
  isLiked?: boolean;
  isDeleted?: boolean;
  replies?: ForumThreadComment[];
};
