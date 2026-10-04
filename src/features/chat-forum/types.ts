import type {
  PostType,
  ReactionCounts,
  UserReactions,
} from "@app-types/dao-forum";

export type {
  ForumCommentPreview,
  ForumPostPreview,
} from "@app-types/dao-forum";

export type ForumThreadSort = "oldest" | "latest" | "most_likes";

export type ForumThreadAuthor = {
  name: string;
  walletAddress?: string;
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
  viewCount: number;
  statusLabel?: string;
  imageUrl?: string | null;
  anonymous?: boolean;
  isPinned?: boolean;
  isOwnPost?: boolean;
};

export type ForumThreadComment = {
  id: string;
  body: string;
  author: ForumThreadAuthor;
  createdAt: string;
  createdAtLabel: string;
  reactionCounts?: ReactionCounts;
  userReactions?: UserReactions;
  isDeleted?: boolean;
  isOwnComment?: boolean;
  imageUrl?: string | null;
  replies?: ForumThreadComment[];
};
