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
