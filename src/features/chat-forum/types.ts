import type {
  PostType,
  ReactionCounts,
  ReactionType,
  UserReactions,
} from "@app-types/dao-forum";

export type {
  ForumCommentPreview,
  ForumPostPreview,
} from "@app-types/dao-forum";

export type ForumThreadSort = "oldest" | "latest" | "most_reacted";

/** A single reaction type, or every reaction type summed together. */
export type ForumReactionFilterType = ReactionType | "all";

export type ForumCommentFilter = {
  reaction: ForumReactionFilterType;
  /** Minimum number of matching reactions a comment needs to be shown. */
  minCount: number;
};

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
  /** Kept only so a matching reply stays nested; it does not match itself. */
  isContextOnly?: boolean;
  imageUrl?: string | null;
  replies?: ForumThreadComment[];
};
