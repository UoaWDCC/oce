"use client";
import { useState } from "react";
import { ForumPanel } from "@/features/chat-forum";
import { DAO } from "./types";
import { useDaoForumAuthSession } from "@/features/chat-forum/hooks/useDaoForumAuthSession";
import { useDaoForumPosts } from "@/features/chat-forum/hooks/useDaoForumPosts";
import { useDaoForumComments } from "@/features/chat-forum/hooks/useDaoForumComments";
import { useCreateDaoForumPost } from "@/features/chat-forum/hooks/useCreateDaoForumPost";
import { useCreateDaoForumComment } from "@/features/chat-forum/hooks/useCreateDaoForumComment";
import { useUpdateDaoForumPost } from "@/features/chat-forum/hooks/useUpdateDaoForumPost";
import { useDeleteDaoForumPost } from "@/features/chat-forum/hooks/useDeleteDaoForumPost";
import { useDaoForumCommentLike } from "@/features/chat-forum/hooks/useDaoForumCommentLike";
import { useRecordPostView } from "@/features/chat-forum/hooks/useRecordPostView";
import {
  submitForumComment,
  submitForumPost,
  submitForumPostDelete,
  submitForumPostUpdate,
} from "@/features/chat-forum/submitHandlers";
import { applyUpdatedPostToPreview } from "@/features/chat-forum/mappers";
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
  const currentUserId = authSession.userId;
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [commentSort, setCommentSort] = useState<ForumThreadSort>("latest");

  const {
    posts,
    isLoading,
    error,
    refetch: refetchPosts,
    replacePost,
    removePost,
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
    currentUserId,
  );

  const { createPost, error: createPostError } = useCreateDaoForumPost(
    daoGroupId,
    token,
  );
  const {
    updatePost,
    error: updatePostError,
    isSubmitting: isUpdatingPost,
  } = useUpdateDaoForumPost(daoGroupId, selectedPostId, token);
  const {
    deletePost,
    error: deletePostError,
    isSubmitting: isDeletingPost,
  } = useDeleteDaoForumPost(daoGroupId, selectedPostId, token);
  const { createComment, error: createCommentError } = useCreateDaoForumComment(
    daoGroupId,
    selectedPostId,
    currentUserId,
    token,
  );
  const {
    likeComment,
    unlikeComment,
    error: commentLikeError,
  } = useDaoForumCommentLike();

  const { recordView } = useRecordPostView(token);

  const handleSubmitPost = async (
    payload: PostSubmitPayload,
  ): Promise<void> => {
    await submitForumPost({ createPost, refetchPosts }, payload);
  };

  const handleUpdatePost = async (
    postId: string,
    payload: PostSubmitPayload,
  ): Promise<void> => {
    await submitForumPostUpdate(
      {
        updatePost,
        applyUpdatedPost: (updated) => {
          const existing = posts.find((post) => post.id === postId);
          if (!existing) return;
          replacePost(
            applyUpdatedPostToPreview(existing, updated, currentUserId),
          );
        },
        refetchPosts,
      },
      payload,
    );
  };

  const handleDeletePost = async (postId: string): Promise<boolean> => {
    return submitForumPostDelete({
      deletePost,
      removePost: () => removePost(postId),
      refetchPosts,
    });
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

  const isUnauthenticated = authSession.status === "unauthenticated";
  const signInMessage = "Sign in to view the DAO forum.";

  const postsError = isUnauthenticated
    ? signInMessage
    : (error?.message ?? createPostError?.message);
  const threadError = isUnauthenticated
    ? signInMessage
    : (commentsError?.message ??
      createCommentError?.message ??
      commentLikeError?.message);
  const mutationError = updatePostError?.message ?? deletePostError?.message;

  return (
    <ForumPanel
      comments={comments}
      currentUserId={currentUserId}
      daoGroupId={daoGroupId}
      daoName={dao.Name}
      commentSort={commentSort}
      commentsError={threadError}
      error={postsError}
      isCommentsLoading={isCommentsLoading}
      isDeletingPost={isDeletingPost}
      isLoading={authSession.status === "loading" || isLoading}
      isUpdatingPost={isUpdatingPost}
      mutationError={mutationError}
      onCommentSortChange={setCommentSort}
      onDeletePost={handleDeletePost}
      onLikeComment={handleLikeComment}
      onSelectPost={handleSelectPost}
      onSubmitPost={handleSubmitPost}
      onSubmitComment={handleSubmitComment}
      onCommentRefetch={refetchComments}
      onUpdatePost={handleUpdatePost}
      posts={posts}
      token={token}
    />
  );
}
