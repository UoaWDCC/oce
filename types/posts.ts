export interface Post {
  id: string;
  dao_group_id: string;
  author_id: string;
  post_type_id: number;
  title: string | null;
  body: string | null;
  anonymous: boolean;
  is_pinned: boolean;
  image_url: string | null;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
}

export interface PostSummary {
  id: string;
  author_id: string;
  post_type_id: number;
  title: string | null;
  anonymous: boolean;
  is_pinned: boolean;
  created_at: string;
  deleted_at: string | null;
}

export interface CreatePostFields {
  post_type_id: number;
  title: string;
  body: string;
  anonymous: boolean;
  is_pinned: boolean;
  image_url: string | null;
}

export interface UpdatePostFields {
  post_type_id: number;
  title: string;
  body: string;
  anonymous: boolean;
  is_pinned: boolean;
  image_url: string | null;
  updated_at: string | null;
}