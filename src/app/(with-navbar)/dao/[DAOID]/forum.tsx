"use client";
import { useState } from "react";
import { ForumPanel } from "@/features/chat-forum";
import { DAO } from "./types";
import { useDaoForumAuthSession } from "@/features/chat-forum/hooks/useDaoForumAuthSession";
import { useDaoForumPosts } from "@/features/chat-forum/hooks/useDaoForumPosts";
import { useDaoForumComments } from "@/features/chat-forum/hooks/useDaoForumComments";
import { useCreateDaoForumPost } from "@/features/chat-forum/hooks/useCreateDaoForumPost";
import { useCreateDaoForumComment } from "@/features/chat-forum/hooks/useCreateDaoForumComment";
import { useDaoForumCommentLike } from "@/features/chat-forum/hooks/useDaoForumCommentLike";
import { useRecordPostView } from "@/features/chat-forum/hooks/useRecordPostView";
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
  const authSession = useDaoForumAuthSession();
  const token = authSession.token;
  const isAuthenticated = authSession.status === "authenticated";
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [commentSort, setCommentSort] = useState<ForumThreadSort>("latest");

  const {
    posts,
    isLoading,
    error,
    refetch: refetchPosts,
  } = useDaoForumPosts(daoGroupId, token, isAuthenticated);
  const {
    comments,
    isLoading: isCommentsLoading,
    error: commentsError,
    refetch: refetchComments,
  } = useDaoForumComments(
    daoGroupId,
    selectedPostId,
    token,
    commentSort,
    isAuthenticated,
  );

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

  const { recordView } = useRecordPostView();

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

  const handleSelectPost = async (postId: string | null): Promise<void> => {
    setSelectedPostId(postId);
    if (postId) {
      const succeeded = await recordView(postId);
      if (succeeded) {
        await refetchPosts();
      }
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
      onSelectPost={handleSelectPost}
      onSubmitPost={handleSubmitPost}
      onSubmitComment={handleSubmitComment}
      posts={posts}
    />
  );
}
