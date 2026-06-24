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
}
