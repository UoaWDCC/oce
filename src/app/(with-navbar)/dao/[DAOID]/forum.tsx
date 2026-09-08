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
import { PENDING_ASYNC_STATE } from "@/features/chat-forum/lib/asyncState";
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

  const postsQuery = useDaoForumPosts(
    daoGroupId,
    token,
    isAuthenticated,
    currentUserId,
  );
  const {
    posts,
    error,
    refetch: refetchPosts,
    replacePost,
    removePost,
  } = postsQuery;
  const commentsQuery = useDaoForumComments(
    daoGroupId,
    selectedPostId,
    token,
    commentSort,
    isAuthenticated,
    currentUserId,
  );
  const {
    comments,
    error: commentsError,
    refetch: refetchComments,
  } = commentsQuery;

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
    toggleLike,
    optimisticState,
    error: commentLikeError,
  } = useDaoForumCommentLike(daoGroupId, selectedPostId, currentUserId);

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

  const handleLikeComment = (commentId: string): void => {
    const comment = comments.find((item) => item.id === commentId);
    if (!comment || comment.isDeleted || !token) return;
    if (comment.isLiked === undefined || comment.likeCount === undefined)
      return;
    toggleLike(commentId, comment.isLiked, comment.likeCount, token);
  };

  const handleSelectPost = async (postId: string | null): Promise<void> => {
    setSelectedPostId(postId);
    if (postId) {
      const succeeded = await recordView(postId);
      if (succeeded) {
        const post = posts.find((item) => item.id === postId);
        if (post && post.isUnread) {
          replacePost({ ...post, isUnread: false });
        }
      }
    }
  };

  const isUnauthenticated = authSession.status === "unauthenticated";
  const signInMessage = "Sign in to view the DAO forum.";

  /**
   * The forum queries stay disabled until the auth session resolves, and a
   * disabled query reports nothing at all. From the user's point of view that
   * window is still a first load, so it is reported as one — which is what
   * keeps the empty state and the zero counts off the screen until there is
   * something true to say.
   */
  const isAuthPending = authSession.status === "loading";
  const postsState = isAuthPending ? PENDING_ASYNC_STATE : postsQuery;
  const commentsState = isAuthPending ? PENDING_ASYNC_STATE : commentsQuery;

  const postsError = isUnauthenticated
    ? signInMessage
    : (error?.message ?? createPostError?.message);
  const threadError = isUnauthenticated
    ? signInMessage
    : (commentsError?.message ??
      createCommentError?.message ??
      commentLikeError?.message);
  const mutationError = updatePostError?.message ?? deletePostError?.message;
  const optimisticComments = comments.map((comment) => {
    const override = optimisticState[comment.id];
    return override ? { ...comment, ...override } : comment;
  });

  return (
    <ForumPanel
      comments={optimisticComments}
      currentUserId={currentUserId}
      daoGroupId={daoGroupId}
      daoName={dao.Name}
      commentSort={commentSort}
      commentsError={threadError}
      error={postsError}
      commentsState={commentsState}
      isDeletingPost={isDeletingPost}
      postsState={postsState}
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
