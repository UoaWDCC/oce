"use client";

import ReactMarkdown from "react-markdown";
import {
  ArrowLeft,
  BookOpen,
  Eye,
  Heart,
  MessageCircle,
  Reply,
  X,
} from "lucide-react";
import StudentAvatar from "@/components/common/StudentAvatar";
import CommentEntryComposer from "@/components/dao-forum/CommentEntryComposer";
import Tag from "@/components/dao-forum/Tag";
import type { CommentSubmitPayload } from "@app-types/dao-forum";
import type {
  ForumThreadComment,
  ForumThreadPost,
  ForumThreadSort,
} from "../types";

type PostThreadProps = {
  post: ForumThreadPost;
  comments: ForumThreadComment[];
  sort?: ForumThreadSort;
  onBack?: () => void;
  onSortChange?: (sort: ForumThreadSort) => void;
  onSubmitComment?: (payload: CommentSubmitPayload) => Promise<void>;
  onLikeComment?: (commentId: string) => void;
  onReplyToComment?: (commentId: string) => void;
  replyingTo?: { id: string; authorName: string } | null;
  onCancelReply?: () => void;
  isLoadingComments?: boolean;
  commentsError?: string | null;
  className?: string;
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
        components={{
          p: ({ children }) => <p>{children}</p>,
          strong: ({ children }) => (
            <strong className="font-bold text-slate-900">{children}</strong>
          ),
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
  onLikeComment?: (commentId: string) => void;
  onReplyToComment?: (commentId: string) => void;
};

function ThreadComment({
  comment,
  onLikeComment,
  onReplyToComment,
}: ThreadCommentProps) {
  return (
    <div>
      <article className="rounded-2xl border border-purple-100 border-l-4 border-l-purple-500 bg-white p-4 shadow-sm sm:p-5">
        <StudentAvatar
          avatarColor={comment.author.avatarColor}
          badges={<AuthorBadges comment={comment} />}
          displayName={comment.author.name}
          profileImageUrl={comment.author.profileImageUrl}
          size="sm"
          timestamp={{
            label: comment.createdAtLabel,
            dateTime: comment.createdAt,
          }}
          walletAddress={comment.author.walletAddress}
        />

        <div className="mt-4">
          <MarkdownContent content={comment.body} />
        </div>

        <div className="mt-4 flex items-center gap-4 text-sm font-semibold text-slate-500">
          {!comment.isDeleted && onLikeComment && (
            <button
              aria-label={
                comment.isLiked ? "Unlike this comment" : "Like this comment"
              }
              aria-pressed={comment.isLiked}
              className="inline-flex items-center gap-1.5 transition hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
              onClick={() => onLikeComment(comment.id)}
              type="button"
            >
              <Heart
                aria-hidden="true"
                className={classNames(
                  "h-4 w-4",
                  comment.isLiked && "fill-red-500 text-red-500",
                )}
              />
              {comment.likeCount}
            </button>
          )}
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

      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-3 space-y-3 border-l-2 border-purple-200 pl-3 sm:pl-6">
          {comment.replies.map((reply) => (
            <ThreadComment
              key={reply.id}
              comment={reply}
              onLikeComment={onLikeComment}
              onReplyToComment={onReplyToComment}
            />
          ))}
        </div>
      )}
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
  post,
  comments,
  sort = "latest",
  onBack,
  onSortChange,
  onSubmitComment,
  onLikeComment,
  onReplyToComment,
  replyingTo = null,
  onCancelReply,
  isLoadingComments = false,
  commentsError = null,
  className,
}: PostThreadProps) {
  const commentCount = countComments(comments);
  const viewLabel = `${post.viewCount} ${post.viewCount === 1 ? "view" : "views"}`;

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

      <article className="rounded-2xl border border-purple-100 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex items-start gap-4">
          <div className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-md sm:flex">
            <BookOpen aria-hidden="true" className="h-7 w-7" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
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

            <div className="mt-3">
              <h1
                id={`forum-thread-${post.id}`}
                className="max-w-5xl text-2xl font-bold leading-tight text-slate-950 sm:text-3xl"
              >
                {post.title}
              </h1>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <StudentAvatar
                avatarColor={post.author.avatarColor}
                displayName={post.author.name}
                profileImageUrl={post.author.profileImageUrl}
                size="sm"
                timestamp={{
                  label: post.createdAtLabel,
                  dateTime: post.createdAt,
                }}
                walletAddress={post.author.walletAddress}
              />
              <span className="flex shrink-0 items-center gap-1.5 text-sm font-semibold text-slate-500">
                <Eye aria-hidden="true" className="h-4 w-4" />
                {viewLabel}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-7 border-t border-slate-100 pt-7">
          <MarkdownContent content={post.body} />
        </div>
      </article>

      <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xl font-bold text-slate-950">
          <MessageCircle aria-hidden="true" className="h-5 w-5" />
          {commentCount} {commentCount === 1 ? "Reply" : "Replies"}
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

      {replyingTo && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-purple-200 bg-purple-100/70 px-4 py-3 text-sm font-semibold text-purple-700">
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
      )}

      <CommentEntryComposer
        className="mt-4 border-purple-100"
        disabled={!onSubmitComment}
        onSubmit={onSubmitComment ?? (() => Promise.resolve())}
        parentCommentId={replyingTo?.id}
        showAttachment
      />

      <div className="mt-5 space-y-4">
        {commentsError ? (
          <div
            className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700"
            role="alert"
          >
            {commentsError}
          </div>
        ) : isLoadingComments ? (
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
              onLikeComment={onLikeComment}
              onReplyToComment={onReplyToComment}
            />
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-purple-200 bg-white p-8 text-center text-sm font-semibold text-slate-500">
            No replies yet. Start the discussion.
          </div>
        )}
      </div>
    </section>
  );
}
