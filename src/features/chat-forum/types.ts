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
