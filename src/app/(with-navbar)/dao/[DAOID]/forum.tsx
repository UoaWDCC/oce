"use client";
import { useState, useEffect } from "react";
import { ForumPanel } from "@/features/chat-forum";
import { DAO } from "./types";
import { createClient } from "@/utils/supabase/client";
import { useDaoForumPosts } from "@/features/chat-forum/hooks/useDaoForumPosts";
import { useDaoForumComments } from "@/features/chat-forum/hooks/useDaoForumComments";
import { useCreateDaoForumPost } from "@/features/chat-forum/hooks/useCreateDaoForumPost";
import { useCreateDaoForumComment } from "@/features/chat-forum/hooks/useCreateDaoForumComment";
import { useDaoForumCommentLike } from "@/features/chat-forum/hooks/useDaoForumCommentLike";
import {
  submitForumComment,
  submitForumPost,
} from "@/features/chat-forum/submitHandlers";
import type {
  CommentSubmitPayload,
  PostSubmitPayload,
} from "@app-types/dao-forum";
import type { ForumThreadSort } from "@/features/chat-forum";

type DaoForumProps = {
  dao: DAO;
  daoGroupId: string;
};

export default function DaoForum({ dao, daoGroupId }: DaoForumProps) {
  const supabase = createClient();
  const [token, setToken] = useState<string | undefined>(undefined);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [commentSort, setCommentSort] = useState<ForumThreadSort>("latest");

  useEffect(() => {
    async function fetchToken() {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      setToken(accessToken);
    }
    fetchToken();
  }, []);

  const {
    posts,
    isLoading,
    error,
    refetch: refetchPosts,
  } = useDaoForumPosts(daoGroupId, token);
  const {
    comments,
    isLoading: isCommentsLoading,
    error: commentsError,
    refetch: refetchComments,
  } = useDaoForumComments(daoGroupId, selectedPostId, token, commentSort);

  const { createPost, error: createPostError } = useCreateDaoForumPost(
    daoGroupId,
    token,
  );
  const { createComment, error: createCommentError } = useCreateDaoForumComment(
    daoGroupId,
    selectedPostId,
    token,
  );
  const {
    likeComment,
    unlikeComment,
    error: commentLikeError,
  } = useDaoForumCommentLike();

  const handleSubmitPost = async (
    payload: PostSubmitPayload,
  ): Promise<void> => {
    await submitForumPost({ createPost, refetchPosts }, payload);
  };

  const handleSubmitComment = async (
    _postId: string,
    payload: CommentSubmitPayload,
  ): Promise<void> => {
    await submitForumComment({ createComment, refetchComments }, payload);
  };

  const handleLikeComment = async (commentId: string): Promise<void> => {
    const comment = comments.find((item) => item.id === commentId);
    if (!comment || comment.isDeleted) return;

    const succeeded = comment.isLiked
      ? await unlikeComment(commentId, token)
      : await likeComment(commentId, token);

    if (succeeded) {
      await refetchComments();
    }
  };

  const postsError = error?.message ?? createPostError?.message;
  const threadError =
    commentsError?.message ??
    createCommentError?.message ??
    commentLikeError?.message;

  return (
    <ForumPanel
      comments={comments}
      daoGroupId={daoGroupId}
      daoName={dao.Name}
      commentSort={commentSort}
      commentsError={threadError}
      error={postsError}
      isCommentsLoading={isCommentsLoading}
      isLoading={isLoading}
      onCommentSortChange={setCommentSort}
      onLikeComment={handleLikeComment}
      onSelectPost={setSelectedPostId}
      onSubmitPost={handleSubmitPost}
      onSubmitComment={handleSubmitComment}
      posts={posts}
    />
  );
}
