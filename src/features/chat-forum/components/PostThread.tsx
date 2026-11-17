"use client";
import { useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  Eye,
  Loader2,
  MessageCircle,
  Pencil,
  Trash2,
} from "lucide-react";
import StudentAvatar from "@/components/common/StudentAvatar";
import CommentEntryComposer from "./CommentEntryComposer";
import ConfirmDeleteDialog from "./ConfirmDeleteDialog";
import PostEntryComposer from "./PostEntryComposer";
import Tag from "./Tag";
import ThreadComment from "./ThreadComment";
import ForumPollCard from "./ForumPollCard";
import CommentViewMenu from "./CommentViewMenu";
import { MarkdownContent, AttachedImage } from "./ForumContent";
import type {
  CommentSubmitPayload,
  PostSubmitPayload,
  ReactionType,
} from "../contracts";
import type {
  ForumCommentFilter,
  ForumThreadComment,
  ForumThreadPost,
  ForumThreadSort,
} from "../types";
import { getPostTypePresentation } from "../postTypePresentation";
import { RESOLVED_ASYNC_STATE, type ForumAsyncState } from "../lib/asyncState";
import {
  DEFAULT_COMMENT_FILTER,
  isCommentFilterActive,
} from "../lib/commentReactions";
import { classNames } from "../lib/classNames";

type PostThreadProps = {
  daoGroupId: string;
  post: ForumThreadPost;
  comments: ForumThreadComment[];
  sort?: ForumThreadSort;
  filter?: ForumCommentFilter;
  onBack?: () => void;
  onSortChange?: (sort: ForumThreadSort) => void;
  onFilterChange?: (filter: ForumCommentFilter) => void;
  onSubmitComment?: (payload: CommentSubmitPayload) => Promise<void>;
  onCommentRefetch?: () => Promise<void>;
  onReaction?: (
    commentId: string,
    reaction: ReactionType,
  ) => void | Promise<void>;
  onReplyToComment?: (commentId: string) => void;
  onUpdatePost?: (payload: PostSubmitPayload) => Promise<void>;
  onDeletePost?: () => Promise<boolean> | boolean;
  isUpdatingPost?: boolean;
  isDeletingPost?: boolean;
  mutationError?: string | null;
  replyingTo?: { id: string; authorName: string } | null;
  onCancelReply?: () => void;
  /** Loading/refresh/failure state for this thread's comments. */
  commentsState?: ForumAsyncState;
  commentsError?: string | null;
  className?: string;
  daoName?: string;
  token?: string;
  currentUserId?: string | null;
};

/** Counts live comments, excluding ancestors shown only as context. */
function countComments(comments: ForumThreadComment[]): number {
  return comments.reduce(
    (count, comment) =>
      count +
      (comment.isDeleted || comment.isContextOnly ? 0 : 1) +
      countComments(comment.replies ?? []),
    0,
  );
}

export default function PostThread({
  daoGroupId,
  post,
  comments,
  sort = "latest",
  filter = DEFAULT_COMMENT_FILTER,
  onBack,
  onSortChange,
  onFilterChange,
  onSubmitComment,
  onCommentRefetch,
  onReaction,
  onReplyToComment,
  onUpdatePost,
  onDeletePost,
  isUpdatingPost = false,
  isDeletingPost = false,
  mutationError = null,
  replyingTo = null,
  onCancelReply,
  commentsState = RESOLVED_ASYNC_STATE,
  commentsError = null,
  className,
  daoName = "the DAO",
  token,
  currentUserId,
}: PostThreadProps) {
  const commentCount = countComments(comments);
  const isFiltered = isCommentFilterActive(filter);
  /**
   * Comment counts are derived from the loaded thread, so they are only
   * meaningful once it has settled. Until then the labels say what is actually
   * happening rather than asserting a zero the user is about to see replaced.
   * A filtered thread only holds the matching replies, so the post's total
   * is withheld and the heading counts matches instead.
   */
  const commentCountLabel =
    commentsState.hasResolved && !isFiltered
      ? `${commentCount} ${commentCount === 1 ? "comment" : "comments"}`
      : "comments";
  const replyCountLabel = !commentsState.hasResolved
    ? "Replies"
    : isFiltered
      ? `${commentCount} Matching ${commentCount === 1 ? "reply" : "replies"}`
      : `${commentCount} ${commentCount === 1 ? "Reply" : "Replies"}`;
  const viewLabel = `${post.viewCount} ${post.viewCount === 1 ? "view" : "views"}`;
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isRefetchingAfterDelete, setIsRefetchingAfterDelete] = useState(false);

  // The delete dialog stays open until this refetch finishes, so the user
  // already has something on screen for it; the heading spinner stays quiet.
  const refetchAfterDelete = async () => {
    setIsRefetchingAfterDelete(true);
    try {
      await onCommentRefetch?.();
    } finally {
      setIsRefetchingAfterDelete(false);
    }
  };
  /** Untyped posts keep the generic book glyph. */
  const PostTypeIcon = post.postType
    ? getPostTypePresentation(post.postType).icon
    : BookOpen;

  const handleUpdatePost = async (payload: PostSubmitPayload) => {
    await onUpdatePost?.(payload);
    setIsEditing(false);
  };

  const handleConfirmDelete = async () => {
    const deleted = await onDeletePost?.();
    if (deleted) {
      setIsDeleteConfirmOpen(false);
    }
  };
  const showOwnerActions = Boolean(post.isOwnPost);
  const showDeleteAction = Boolean(post.isOwnPost || post.canDelete);

  return (
    <section
      className={classNames(
        "rounded-3xl bg-purple-50/70 p-4 sm:p-6",
        className,
      )}
      aria-labelledby={`forum-thread-${post.id}`}
    >
      {onBack && (
        <button
          className="mb-5 inline-flex items-center gap-2 font-semibold text-purple-700 transition hover:text-purple-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2"
          onClick={onBack}
          type="button"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Back to Forum
        </button>
      )}

      {isEditing && onUpdatePost ? (
        <PostEntryComposer
          key={post.id}
          daoName={daoName}
          mode="edit"
          disabled={isUpdatingPost}
          initialValues={{
            title: post.title,
            body: post.body,
            postType: post.postType ?? undefined,
            anonymous: post.anonymous,
            isPinned: post.isPinned,
            imageUrl: post.imageUrl,
          }}
          onCancel={() => setIsEditing(false)}
          onClose={() => setIsEditing(false)}
          onSubmit={handleUpdatePost}
        />
      ) : (
        <article className="rounded-2xl border border-purple-100 bg-white p-5 shadow-sm sm:p-6">
          {/* Top row: type/tags/status (left) + avatar (right) */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-sm">
                <PostTypeIcon aria-hidden="true" className="h-5 w-5" />
              </span>
              {post.postType && <Tag size="md" type={post.postType} />}
              {post.statusLabel && (
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                  ● {post.statusLabel}
                </span>
              )}
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700"
                >
                  {tag}
                </span>
              ))}
            </div>
            <StudentAvatar
              displayName={post.author.name}
              size="sm"
              walletAddress={post.author.walletAddress}
            />
          </div>

          {/* Title */}
          <h1
            id={`forum-thread-${post.id}`}
            className="mt-4 pl-3 text-xl font-bold leading-snug text-slate-950 sm:text-2xl"
          >
            {post.title}
          </h1>

          {/* Body */}
          <div className="mt-3 pl-3">
            <MarkdownContent content={post.body} />
            {post.imageUrl && (
              <AttachedImage src={post.imageUrl} alt="Post attachment" />
            )}
            <ForumPollCard
              daoGroupId={daoGroupId}
              postId={post.id}
              token={token}
              currentUserId={currentUserId}
            />
          </div>

          {/* Footer: views/comments (left) + timestamp (right) */}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <span className="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-500">
              <span className="flex shrink-0 items-center gap-1.5">
                <Eye aria-hidden="true" className="h-4 w-4" />
                {viewLabel}
              </span>
              <span className="flex shrink-0 items-center gap-1.5">
                <MessageCircle aria-hidden="true" className="h-4 w-4" />
                {commentCountLabel}
              </span>
            </span>
            <div className="flex items-center gap-2">
              {showOwnerActions && onUpdatePost && (
                <button
                  type="button"
                  aria-label="Edit post"
                  className="rounded-full p-1.5 text-slate-400 transition hover:bg-purple-50 hover:text-purple-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2"
                  onClick={() => setIsEditing(true)}
                >
                  <Pencil aria-hidden="true" className="h-4 w-4" />
                </button>
              )}
              {showDeleteAction && onDeletePost && (
                <button
                  type="button"
                  aria-label="Delete post"
                  className="rounded-full p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                  onClick={() => setIsDeleteConfirmOpen(true)}
                >
                  <Trash2 aria-hidden="true" className="h-4 w-4" />
                </button>
              )}
              <time
                className="text-xs font-semibold text-slate-400"
                dateTime={post.createdAt}
              >
                {post.createdAtLabel}
              </time>
            </div>
          </div>
        </article>
      )}

      {mutationError && (
        <div
          className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700"
          role="alert"
        >
          {mutationError}
        </div>
      )}

      {isDeleteConfirmOpen && (
        <ConfirmDeleteDialog
          isSubmitting={isDeletingPost}
          onCancel={() => setIsDeleteConfirmOpen(false)}
          onConfirm={handleConfirmDelete}
        />
      )}

      <div className="relative mt-7 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xl font-bold text-slate-950">
          <MessageCircle aria-hidden="true" className="h-5 w-5" />
          {replyCountLabel}
          {commentsState.isInitialLoading ? (
            /* Decorative only: the skeleton below already carries
               aria-label="Loading replies", so announcing it here too would
               just say the same thing twice. */
            <Loader2
              aria-hidden="true"
              className="h-4 w-4 animate-spin text-purple-500"
            />
          ) : commentsState.isRefreshing && !isRefetchingAfterDelete ? (
            <span role="status">
              <Loader2
                aria-hidden="true"
                className="h-4 w-4 animate-spin text-purple-500"
              />
              <span className="sr-only">Refreshing replies</span>
            </span>
          ) : null}
        </h2>
        <CommentViewMenu
          filter={filter}
          onFilterChange={onFilterChange}
          onSortChange={onSortChange}
          sort={sort}
        />
      </div>

      {!replyingTo && (
        <CommentEntryComposer
          className="mt-4 border-purple-100"
          disabled={!onSubmitComment}
          onSubmit={onSubmitComment ?? (() => Promise.resolve())}
          showAttachment
        />
      )}

      <div className="mt-5 space-y-4">
        {/* A failed refresh leaves the previously loaded replies in the cache,
            so the banner stacks above them instead of taking their place. Only
            a failure with nothing behind it replaces the list outright. */}
        {commentsError && (
          <div
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700"
            role="alert"
          >
            <span>{commentsError}</span>
            {commentsState.error && (
              <button
                className="rounded-full border border-red-300 bg-white px-4 py-1.5 font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-60"
                disabled={commentsState.isRefreshing}
                onClick={commentsState.retry}
                type="button"
              >
                {commentsState.isRefreshing ? "Retrying…" : "Retry"}
              </button>
            )}
          </div>
        )}
        {commentsState.isInitialLoading ? (
          <div className="space-y-3" aria-label="Loading replies">
            {[0, 1].map((item) => (
              <div
                key={item}
                className="h-32 animate-pulse rounded-2xl bg-purple-100/70"
              />
            ))}
          </div>
        ) : comments.length > 0 ? (
          comments.map((comment) => (
            <ThreadComment
              key={comment.id}
              comment={comment}
              onReaction={onReaction}
              onReplyToComment={onReplyToComment}
              replyingTo={replyingTo}
              onCancelReply={onCancelReply}
              onSubmitComment={onSubmitComment}
              onCommentRefetch={onCommentRefetch}
              onDeleteRefetch={refetchAfterDelete}
              token={token}
            />
          ))
        ) : (
          commentsState.hasResolved &&
          !commentsState.isBlockingError &&
          (isFiltered ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-purple-200 bg-white p-8 text-center text-sm font-semibold text-slate-500">
              <span>No replies match this reaction filter.</span>
              {onFilterChange && (
                <button
                  className="rounded-full border border-purple-200 px-4 py-1.5 font-bold text-purple-700 transition hover:bg-purple-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
                  onClick={() => onFilterChange(DEFAULT_COMMENT_FILTER)}
                  type="button"
                >
                  Reset filters
                </button>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-purple-200 bg-white p-8 text-center text-sm font-semibold text-slate-500">
              No replies yet. Start the discussion.
            </div>
          ))
        )}
      </div>
    </section>
  );
}
