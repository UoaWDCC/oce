"use client";
import React, { useEffect, useRef, useState } from "react";
import {
  MoreHorizontal,
  Pencil,
  Reply,
  SmilePlus,
  Trash2,
  X,
} from "lucide-react";
import StudentAvatar from "@/components/common/StudentAvatar";
import CommentEntryComposer from "./CommentEntryComposer";
import ConfirmDeleteDialog from "./ConfirmDeleteDialog";
import { MarkdownContent, AttachedImage } from "./ForumContent";
import type { CommentSubmitPayload, ReactionType } from "../contracts";
import type { ForumThreadComment } from "../types";
import { useUpdateDaoForumComment } from "../hooks/useUpdateDaoForumComment";
import { useDeleteDaoForumComment } from "../hooks/useDeleteDaoForumComment";
import { REACTIONS } from "../lib/reactionPresentation";
import { classNames } from "../lib/classNames";

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
  /** Refetch after a delete, which the thread keeps quiet about. */
  onDeleteRefetch?: () => Promise<void>;
  token?: string;
};

const MAX_NESTING_DEPTH = 5;
export default function ThreadComment({
  comment,
  onReaction,
  onReplyToComment,
  replyingTo,
  onCancelReply,
  onSubmitComment,
  depth = 0,
  parentAuthorName,
  onCommentRefetch,
  onDeleteRefetch,
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
      await (onDeleteRefetch ?? onCommentRefetch)?.();
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
      <article
        className={classNames(
          "rounded-2xl border border-l-4 p-4 shadow-sm sm:p-5",
          comment.isContextOnly
            ? "border-dashed border-slate-200 border-l-slate-300 bg-slate-50"
            : "border-purple-100 border-l-purple-500 bg-white",
        )}
      >
        {comment.isContextOnly && (
          <div className="mb-2 text-xs font-semibold text-slate-500">
            Shown for context. Doesn&apos;t match the reaction filter.
          </div>
        )}
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
                  {REACTIONS.map(({ type, label, emoji }) => {
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
          {REACTIONS.map(({ type, emoji, label }) => {
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
                    onDeleteRefetch={onDeleteRefetch}
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
                  onDeleteRefetch={onDeleteRefetch}
                  token={token}
                />
              </div>
            ))}
          </>
        ))}
    </div>
  );
}
