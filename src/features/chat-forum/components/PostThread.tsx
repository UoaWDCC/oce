"use client";

import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import {
  ArrowLeft,
  BookOpen,
  Eye,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Reply,
  SmilePlus,
  Trash2,
  X,
} from "lucide-react";
import StudentAvatar from "@/components/common/StudentAvatar";
import CommentEntryComposer from "@/components/dao-forum/CommentEntryComposer";
import ConfirmDeleteDialog from "@/components/dao-forum/ConfirmDeleteDialog";
import PostEntryComposer from "@/components/dao-forum/PostEntryComposer";
import Tag from "@/components/dao-forum/Tag";
import type {
  CommentSubmitPayload,
  PostSubmitPayload,
} from "@app-types/dao-forum";
import type {
  ForumThreadComment,
  ForumThreadPost,
  ForumThreadSort,
} from "../types";
import type { ReactionType } from "@app-types/dao-forum";
import { useUpdateDaoForumComment } from "../hooks/useUpdateDaoForumComment";
import { useDeleteDaoForumComment } from "../hooks/useDeleteDaoForumComment";
import { useDaoForumPoll } from "../hooks/useDaoForumPoll";
import { getPostTypePresentation } from "../postTypePresentation";
import { RESOLVED_ASYNC_STATE, type ForumAsyncState } from "../lib/asyncState";

type PostThreadProps = {
  daoGroupId: string;
  post: ForumThreadPost;
  comments: ForumThreadComment[];
  sort?: ForumThreadSort;
  onBack?: () => void;
  onSortChange?: (sort: ForumThreadSort) => void;
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

const SORT_OPTIONS: Array<{ value: ForumThreadSort; label: string }> = [
  { value: "latest", label: "Latest" },
  { value: "oldest", label: "Oldest" },
  { value: "most_likes", label: "Most liked" },
];

function classNames(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="space-y-4 text-[15px] leading-7 text-slate-700 sm:text-base">
      <ReactMarkdown
        rehypePlugins={[
          rehypeRaw,
          [
            rehypeSanitize,
            {
              ...defaultSchema,
              tagNames: [...(defaultSchema.tagNames ?? []), "u"],
            },
          ],
        ]}
        components={{
          p: ({ children }) => <p>{children}</p>,
          strong: ({ children }) => (
            <strong className="font-bold text-slate-900">{children}</strong>
          ),
          u: ({ children }) => <u className="underline">{children}</u>,
          ul: ({ children }) => (
            <ul className="list-disc space-y-1 pl-6">{children}</ul>
          ),
          li: ({ children }) => <li className="pl-1">{children}</li>,
          pre: ({ children }) => (
            <pre className="overflow-x-auto rounded-xl bg-indigo-950 p-4 text-sm leading-6 text-purple-100 sm:p-5 [&>code]:bg-transparent [&>code]:p-0 [&>code]:text-purple-100">
              {children}
            </pre>
          ),
          code: ({ children, className }) => (
            <code
              className={classNames(
                "rounded bg-purple-100 px-1.5 py-0.5 font-mono text-[0.9em] text-purple-700",
                className,
              )}
            >
              {children}
            </code>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

function AttachedImage({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
      <img
        src={src}
        alt={alt}
        className="max-h-96 w-full object-contain"
        loading="lazy"
      />
    </div>
  );
}

function ForumPollCard({
  daoGroupId,
  postId,
  token,
  currentUserId,
}: {
  daoGroupId: string;
  postId: string;
  token?: string;
  currentUserId?: string | null;
}) {
  const { poll, isInitialLoading, isRefreshing, isVoting, error, retry, vote } =
    useDaoForumPoll(daoGroupId, postId, token, currentUserId);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    setSelectedIds(
      poll?.options
        .filter((option) => option.isSelected)
        .map((option) => option.id) ?? [],
    );
  }, [poll]);

  /**
   * Polls are optional and most posts do not have one, but nothing in the post
   * list says which do — the poll is only discoverable by fetching it. A
   * skeleton here therefore reserved a block of space on *every* thread and
   * then collapsed it again for the majority that turned out to have no poll,
   * shunting the footer, the replies heading and the whole comment thread
   * upwards as it went.
   *
   * Reserving no space is the honest option while we don't know: a post with a
   * poll grows once when it arrives, and a post without one never moves at all.
   * Reserving space correctly needs the post list to tell us whether a poll
   * exists, which is a backend change.
   */
  if (isInitialLoading) return null;
  if (!poll) {
    return error ? (
      <p className="mt-4 flex flex-wrap items-center gap-3 text-sm text-red-600">
        <span>{error.message}</span>
        <button
          className="rounded-full border border-red-300 px-3 py-1 font-bold transition hover:bg-red-50 disabled:opacity-60"
          disabled={isRefreshing}
          onClick={retry}
          type="button"
        >
          {isRefreshing ? "Retrying…" : "Retry"}
        </button>
      </p>
    ) : null;
  }

  const hasExistingVote = poll.options.some((option) => option.isSelected);
  const toggleOption = (optionId: string) => {
    if (!poll.allowMultiple) {
      setSelectedIds([optionId]);
      return;
    }
    setSelectedIds((current) =>
      current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : [...current, optionId],
    );
  };

  return (
    <section
      className="mt-6 rounded-2xl border border-violet-200 bg-violet-50/70 p-5"
      aria-labelledby={`poll-${poll.id}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2
            id={`poll-${poll.id}`}
            className="text-lg font-bold text-slate-900"
          >
            {poll.question}
          </h2>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            {poll.allowMultiple
              ? "Select one or more options"
              : "Select one option"}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {poll.options.map((option) => {
          const percentage =
            poll.totalVoters > 0
              ? Math.round((option.voteCount / poll.totalVoters) * 100)
              : 0;
          return (
            <label
              key={option.id}
              className="block cursor-pointer rounded-xl border border-violet-100 bg-white p-3"
            >
              <span className="flex items-center gap-3">
                <input
                  type={poll.allowMultiple ? "checkbox" : "radio"}
                  name={`poll-${poll.id}`}
                  checked={selectedIds.includes(option.id)}
                  disabled={isVoting}
                  onChange={() => toggleOption(option.id)}
                  className="h-4 w-4 border-slate-300 text-violet-600 focus:ring-violet-500"
                />
                <span className="min-w-0 flex-1 text-sm font-semibold text-slate-700">
                  {option.label}
                </span>
                <span className="text-xs font-bold text-slate-500">
                  {option.voteCount} · {percentage}%
                </span>
              </span>
              <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-violet-100">
                <span
                  className="block h-full rounded-full bg-violet-500"
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                />
              </span>
            </label>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          {poll.totalVoters} {poll.totalVoters === 1 ? "voter" : "voters"}
        </p>
        <button
          type="button"
          disabled={selectedIds.length === 0 || isVoting}
          onClick={() => void vote(selectedIds).catch(() => undefined)}
          className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-bold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isVoting ? "Saving…" : hasExistingVote ? "Update vote" : "Vote"}
        </button>
      </div>
      {error && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error.message}
        </p>
      )}
    </section>
  );
}

function AuthorBadges({ comment }: { comment: ForumThreadComment }) {
  const { badges = [], isEndorsed } = comment.author;

  if (badges.length === 0 && !isEndorsed) return null;

  return (
    <>
      {badges.map((badge) => (
        <span
          key={badge}
          className="rounded-full bg-purple-600 px-2 py-0.5 text-[11px] font-bold text-white"
        >
          {badge}
        </span>
      ))}
      {isEndorsed && (
        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
          ✓ Endorsed
        </span>
      )}
    </>
  );
}

type ThreadCommentProps = {
  comment: ForumThreadComment;
  onReaction?: (
    commentId: string,
    reaction: ReactionType,
  ) => void | Promise<void>;
  onReplyToComment?: (commentId: string) => void;
  replyingTo?: { id: string; authorName: string } | null;
  onCancelReply?: () => void;
  onSubmitComment?: (payload: CommentSubmitPayload) => Promise<void>;
  depth?: number;
  parentAuthorName?: string;
  onCommentRefetch?: () => Promise<void>;
  token?: string;
};

const MAX_NESTING_DEPTH = 5;
function ThreadComment({
  comment,
  onReaction,
  onReplyToComment,
  replyingTo,
  onCancelReply,
  onSubmitComment,
  depth = 0,
  parentAuthorName,
  onCommentRefetch,
  token,
}: ThreadCommentProps) {
  const { updateComment } = useUpdateDaoForumComment(comment.id);
  const {
    deleteComment,
    isSubmitting: isDeleting,
    error: deleteError,
  } = useDeleteDaoForumComment(comment.id);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isReactionPickerOpen, setIsReactionPickerOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const reactionPickerRef = useRef<HTMLDivElement>(null);

  const reactions: Array<{ type: ReactionType; label: string; emoji: string }> =
    [
      { type: "heart", label: "Heart", emoji: "❤️" },
      { type: "thumbs_up", label: "Thumbs up", emoji: "👍" },
      { type: "fire", label: "Fire", emoji: "🔥" },
      { type: "thumbs_down", label: "Thumbs down", emoji: "👎" },
    ];

  const handleEdit = async (data: {
    body?: string | null;
    imageUrl?: string | null;
  }) => {
    await updateComment(data, token);
    await onCommentRefetch?.();
    setIsEditing(false);
  };

  const handleDelete = async () => {
    const deleted = await deleteComment(token);
    if (deleted) {
      await onCommentRefetch?.();
      setIsDeleteConfirmOpen(false);
    }
  };

  useEffect(() => {
    if (!isMenuOpen && !isReactionPickerOpen) return;

    const handleDismiss = (event: KeyboardEvent | PointerEvent) => {
      if (event instanceof KeyboardEvent) {
        if (event.key !== "Escape") return;
        setIsMenuOpen(false);
        setIsReactionPickerOpen(false);
        return;
      }

      const target = event.target as Node;
      if (
        menuRef.current?.contains(target) ||
        reactionPickerRef.current?.contains(target)
      ) {
        return;
      }
      setIsMenuOpen(false);
      setIsReactionPickerOpen(false);
    };

    document.addEventListener("keydown", handleDismiss);
    document.addEventListener("pointerdown", handleDismiss);
    return () => {
      document.removeEventListener("keydown", handleDismiss);
      document.removeEventListener("pointerdown", handleDismiss);
    };
  }, [isMenuOpen, isReactionPickerOpen]);

  return (
    <div>
      <article className="rounded-2xl border border-purple-100 border-l-4 border-l-purple-500 bg-white p-4 shadow-sm sm:p-5">
        {parentAuthorName && depth > MAX_NESTING_DEPTH && (
          <div className="mb-2 text-xs font-semibold text-purple-600">
            Replying to {parentAuthorName}
          </div>
        )}
        <div className="flex items-start justify-between">
          <StudentAvatar
            badges={<AuthorBadges comment={comment} />}
            displayName={comment.author.name}
            size="sm"
            timestamp={{
              label: comment.createdAtLabel,
              dateTime: comment.createdAt,
            }}
            walletAddress={comment.author.walletAddress}
          />
          {comment.isOwnComment && !comment.isDeleted && (
            <div ref={menuRef} className="relative">
              <button
                type="button"
                aria-expanded={isMenuOpen}
                aria-haspopup="menu"
                aria-label="Comment actions"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                <MoreHorizontal className="h-5 w-5" />
              </button>
              {isMenuOpen && (
                <div
                  className="absolute right-0 z-10 mt-1 w-36 rounded-xl border border-slate-200 bg-white shadow-lg"
                  role="menu"
                >
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    onClick={() => {
                      setIsEditing(true);
                      setIsMenuOpen(false);
                    }}
                  >
                    <Pencil className="h-4 w-4" /> Edit
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                    onClick={() => {
                      setIsDeleteConfirmOpen(true);
                      setIsMenuOpen(false);
                    }}
                  >
                    <Trash2 className="h-4 w-4" /> Delete
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {isEditing ? (
          <CommentEntryComposer
            onSubmit={handleEdit}
            onCancel={() => setIsEditing(false)}
            initialBody={comment.body}
            initialImageUrl={comment.imageUrl}
            showAttachment
            className="mt-4"
          />
        ) : (
          <div className="mt-4">
            <MarkdownContent content={comment.body} />
            {comment.imageUrl && (
              <AttachedImage src={comment.imageUrl} alt="Comment attachment" />
            )}
          </div>
        )}

        <div className="mt-4 flex items-center gap-4 text-sm font-semibold text-slate-500">
          {!comment.isDeleted && onReaction && (
            <div ref={reactionPickerRef} className="relative">
              <button
                aria-expanded={isReactionPickerOpen}
                aria-label="Add reaction"
                className="inline-flex cursor-pointer items-center gap-1.5 transition hover:text-purple-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2"
                onClick={() => setIsReactionPickerOpen((open) => !open)}
                type="button"
              >
                <SmilePlus aria-hidden="true" className="h-4 w-4" />
                React
              </button>
              {isReactionPickerOpen && (
                <div className="absolute bottom-full left-0 z-10 mb-2 flex gap-1 rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg">
                  {reactions.map(({ type, label, emoji }) => {
                    const isActive = comment.userReactions?.[type] ?? false;
                    return (
                      <button
                        aria-label={`${isActive ? "Remove" : "Add"} ${label} reaction`}
                        aria-pressed={isActive}
                        className={classNames(
                          "rounded-md px-2 py-1 text-base transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500",
                          isActive && "bg-purple-100",
                        )}
                        key={type}
                        onClick={() => {
                          onReaction(comment.id, type);
                          setIsReactionPickerOpen(false);
                        }}
                        title={label}
                        type="button"
                      >
                        {emoji}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          {reactions.map(({ type, emoji, label }) => {
            const count = comment.reactionCounts?.[type] ?? 0;
            if (count === 0) return null;
            const isActive = comment.userReactions?.[type] ?? false;
            return (
              <button
                type="button"
                aria-label={`${count} ${label} reactions`}
                aria-pressed={isActive}
                className={classNames(
                  "inline-flex cursor-pointer items-center gap-1 rounded-full px-2 py-1 text-xs transition hover:bg-purple-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-1",
                  isActive
                    ? "bg-purple-100 text-purple-700"
                    : "bg-slate-100 text-slate-600",
                )}
                key={type}
                onClick={() => onReaction?.(comment.id, type)}
                title={`${isActive ? "Remove" : "Add"} ${label} reaction`}
              >
                {emoji} {count}
              </button>
            );
          })}
          {!comment.isDeleted && onReplyToComment && (
            <button
              className="inline-flex items-center gap-1.5 transition hover:text-purple-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2"
              onClick={() => onReplyToComment(comment.id)}
              type="button"
            >
              <Reply aria-hidden="true" className="h-4 w-4" />
              Reply
            </button>
          )}
        </div>
      </article>

      {isDeleteConfirmOpen && (
        <ConfirmDeleteDialog
          title="Delete comment?"
          description="This comment will be removed. This cannot be undone."
          confirmLabel="Delete comment"
          isSubmitting={isDeleting}
          error={deleteError?.message}
          onCancel={() => setIsDeleteConfirmOpen(false)}
          onConfirm={handleDelete}
        />
      )}

      {(replyingTo?.id === comment.id ||
        (comment.replies && comment.replies.length > 0)) &&
        (depth < MAX_NESTING_DEPTH ? (
          <div className="flex">
            <div className="flex w-6 shrink-0 justify-start pl-1 sm:w-8">
              <div className="w-0.5 bg-purple-200" />
            </div>

            <div className="min-w-0 flex-1 pt-3">
              {replyingTo?.id === comment.id && (
                <div className="pb-3">
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-purple-200 bg-purple-100/70 px-4 py-3 text-sm font-semibold text-purple-700">
                    <span>Replying to {replyingTo.authorName}</span>
                    {onCancelReply && (
                      <button
                        aria-label="Cancel reply"
                        className="rounded-full p-1 transition hover:bg-purple-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
                        onClick={onCancelReply}
                        type="button"
                      >
                        <X aria-hidden="true" className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <CommentEntryComposer
                    className="mt-2 border-purple-100"
                    disabled={!onSubmitComment}
                    onSubmit={onSubmitComment ?? (() => Promise.resolve())}
                    parentCommentId={replyingTo.id}
                    showAttachment
                    autoFocus
                  />
                </div>
              )}
              {comment.replies?.map((reply) => (
                <div key={reply.id} className="relative pb-3 last:pb-0">
                  <div className="absolute -left-5 -top-3 h-8 w-5 rounded-bl-xl border-b-2 border-l-2 border-purple-200 sm:-left-7 sm:w-7" />
                  <ThreadComment
                    comment={reply}
                    depth={depth + 1}
                    parentAuthorName={comment.author.name}
                    onReaction={onReaction}
                    onReplyToComment={onReplyToComment}
                    replyingTo={replyingTo}
                    onCancelReply={onCancelReply}
                    onSubmitComment={onSubmitComment}
                    onCommentRefetch={onCommentRefetch}
                    token={token}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {replyingTo?.id === comment.id && (
              <div className="mt-3">
                <div className="flex items-center justify-between gap-3 rounded-xl border border-purple-200 bg-purple-100/70 px-4 py-3 text-sm font-semibold text-purple-700">
                  <span>Replying to {replyingTo.authorName}</span>
                  {onCancelReply && (
                    <button
                      aria-label="Cancel reply"
                      className="rounded-full p-1 transition hover:bg-purple-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
                      onClick={onCancelReply}
                      type="button"
                    >
                      <X aria-hidden="true" className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <CommentEntryComposer
                  className="mt-2 border-purple-100"
                  disabled={!onSubmitComment}
                  onSubmit={onSubmitComment ?? (() => Promise.resolve())}
                  parentCommentId={replyingTo.id}
                  showAttachment
                  autoFocus
                />
              </div>
            )}
            {comment.replies?.map((reply) => (
              <div key={reply.id} className="mt-3">
                <ThreadComment
                  comment={reply}
                  depth={depth + 1}
                  parentAuthorName={comment.author.name}
                  onReaction={onReaction}
                  onReplyToComment={onReplyToComment}
                  replyingTo={replyingTo}
                  onCancelReply={onCancelReply}
                  onSubmitComment={onSubmitComment}
                  onCommentRefetch={onCommentRefetch}
                  token={token}
                />
              </div>
            ))}
          </>
        ))}
    </div>
  );
}

function countComments(comments: ForumThreadComment[]): number {
  return comments.reduce(
    (count, comment) => count + 1 + countComments(comment.replies ?? []),
    0,
  );
}

export default function PostThread({
  daoGroupId,
  post,
  comments,
  sort = "latest",
  onBack,
  onSortChange,
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
  /**
   * Comment counts are derived from the loaded thread, so they are only
   * meaningful once it has settled. Until then the labels say what is actually
   * happening rather than asserting a zero the user is about to see replaced.
   */
  const commentCountLabel = commentsState.hasResolved
    ? `${commentCount} ${commentCount === 1 ? "comment" : "comments"}`
    : "comments";
  const replyCountLabel = commentsState.hasResolved
    ? `${commentCount} ${commentCount === 1 ? "Reply" : "Replies"}`
    : "Replies";
  const viewLabel = `${post.viewCount} ${post.viewCount === 1 ? "view" : "views"}`;
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const showOwnerActions = Boolean(post.isOwnPost);
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
              {showOwnerActions && (
                <>
                  {onUpdatePost && (
                    <button
                      type="button"
                      aria-label="Edit post"
                      className="rounded-full p-1.5 text-slate-400 transition hover:bg-purple-50 hover:text-purple-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2"
                      onClick={() => setIsEditing(true)}
                    >
                      <Pencil aria-hidden="true" className="h-4 w-4" />
                    </button>
                  )}
                  {onDeletePost && (
                    <button
                      type="button"
                      aria-label="Delete post"
                      className="rounded-full p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                      onClick={() => setIsDeleteConfirmOpen(true)}
                    >
                      <Trash2 aria-hidden="true" className="h-4 w-4" />
                    </button>
                  )}
                </>
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

      <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xl font-bold text-slate-950">
          <MessageCircle aria-hidden="true" className="h-5 w-5" />
          {replyCountLabel}
          {/* Only a sort switch spins here. A first load already has the
              skeleton below, and add/edit/delete already show their pending
              state in the composer or the delete dialog. */}
          {commentsState.isSwitching && (
            <span role="status">
              <Loader2
                aria-hidden="true"
                className="h-4 w-4 animate-spin text-purple-500"
              />
              <span className="sr-only">Reordering replies</span>
            </span>
          )}
        </h2>
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-500">
          <span>Sort by:</span>
          <select
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
            disabled={!onSortChange}
            onChange={(event) =>
              onSortChange?.(event.target.value as ForumThreadSort)
            }
            value={sort}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
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
              token={token}
            />
          ))
        ) : (
          commentsState.hasResolved &&
          !commentsState.isBlockingError && (
            <div className="rounded-2xl border border-dashed border-purple-200 bg-white p-8 text-center text-sm font-semibold text-slate-500">
              No replies yet. Start the discussion.
            </div>
          )
        )}
      </div>
    </section>
  );
}
