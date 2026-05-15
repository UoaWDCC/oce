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

export interface CreatePostFields {
  post_type_id: number;
  title: string;
  body: string;
  anonymous: boolean;
  is_pinned: boolean;
  image_url: string | null;
}