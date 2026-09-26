export const POST_TYPE = {
  Announcement: "Announcement",
  Proposal: "Proposal",
  Question: "Question",
  Discussion: "Discussion",
  Resource: "Resource",
} as const;

export type PostType = (typeof POST_TYPE)[keyof typeof POST_TYPE];

export interface Post {
  id: string;
  dao_group_id: string;
  author_id: string;
  post_type: PostType | null;
  title: string | null;
  body: string | null;
  anonymous: boolean;
  is_pinned: boolean;
  image_url: string | null;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
}

export interface PostListItem {
  id: string;
  dao_group_id: string;
  author_id: string | null;
  post_type: PostType | null;
  title: string | null;
  body: string | null;
  anonymous: boolean;
  is_pinned: boolean;
  image_url: string | null;
  created_at: string;
  updated_at: string | null;
  comment_count: number;
  view_count: number;
  is_unread: boolean;
  is_own_post?: boolean;
  author: {
    id: string;
    username: string | null;
    FirstName: string | null;
    LastName: string | null;
    Name: string | null;
  } | null;
  tags: string[];
}

export interface CreatePostFields {
  post_type: PostType;
  title: string;
  body: string;
  anonymous: boolean;
  is_pinned: boolean;
  image_url: string | null;
  poll?: CreatePollFields;
}

export interface UpdatePostFields {
  post_type: PostType;
  title: string;
  body: string;
  anonymous: boolean;
  is_pinned: boolean;
  image_url: string | null;
  updated_at: string | null;
}

export type PostSubmitPayload = {
  title: string;
  body: string;
  postType: PostType;
  anonymous: boolean;
  isPinned: boolean;
  imageUrl?: string | null;
  poll?: PollSubmitPayload;
};

export type PollSubmitPayload = {
  question: string;
  options: string[];
  allowMultiple: boolean;
};

export type CreatePollFields = {
  question: string;
  options: string[];
  allow_multiple: boolean;
};

export type ForumPollOption = {
  id: string;
  label: string;
  voteCount: number;
  isSelected: boolean;
};

export type ForumPoll = {
  id: string;
  question: string;
  allowMultiple: boolean;
  totalVoters: number;
  options: ForumPollOption[];
};

export interface CreateCommentFields {
  body?: string | null;
  image_url?: string | null;
  parent_comment_id?: string | null;
}

export interface InsertComment {
  post_id: string;
  author_id: string;
  parent_comment_id?: string | null;
  body?: string | null;
  image_url?: string | null;
}

export interface UpdateCommentFields {
  body?: string | null;
  image_url?: string | null;
}

export interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  parent_comment_id: string | null;
  body: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
}

export interface CommentAuthor {
  id: string;
  username: string;
  FirstName: string;
  LastName: string;
}

export interface RawComment {
  id: string;
  body: string | null;
  image_url: string | null;
  parent_comment_id: string | null;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
  author: CommentAuthor | null;
}

export interface FormattedComment {
  id: string;
  body: string | null;
  image_url: string | null;
  author_id: string;
  username: string;
  like_count: number;
  is_liked: boolean;
  parent_comment_id: string | null;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
}

export type CommentListItem = FormattedComment;

export type CommentSubmitPayload = {
  body: string;
  imageUrl?: string;
  parentCommentId?: string;
};

export interface ForumPostPreview {
  id: string;
  daoId: string;
  title: string;
  excerpt: string;
  authorId?: string;
  authorName: string;
  authorWallet?: string;
  createdAt: string;
  createdAtLabel: string;
  commentCount: number;
  viewCount: number;
  types: PostType[];
  tags: string[];
  anonymous?: boolean;
  isPinned?: boolean;
  isUnread?: boolean;
  isOwnPost?: boolean;
  imageUrl?: string | null;
}

export interface ForumCommentPreview {
  id: string;
  postId: string;
  parentCommentId: string | null;
  authorId?: string;
  authorName: string;
  authorWallet?: string;
  body: string;
  createdAt: string;
  createdAtLabel: string;
  likeCount: number;
  isOwnComment?: boolean;
  isLiked?: boolean;
  isDeleted?: boolean;
  imageUrl?: string | null;
}
