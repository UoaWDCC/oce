"use client";

import { useMemo, useState } from "react";
import {
  CircleHelp,
  List,
  Megaphone,
  MessageCircle,
  Package,
  Plus,
  Search,
  Tag as TagIcon,
} from "lucide-react";
import PostCard from "@/components/dao-forum/Post";
import PostEntryComposer from "@/components/dao-forum/PostEntryComposer";
import PostThread from "./PostThread";
import {
  buildForumThreadComments,
  mapForumPostPreviewToThreadPost,
  withOwnPostCapability,
} from "../mappers";
import type { ForumThreadSort } from "../types";
import type {
  CommentSubmitPayload,
  ForumCommentPreview,
  ForumPostPreview,
  PostSubmitPayload,
  PostType,
} from "@app-types/dao-forum";

type ForumPanelProps = {
  daoGroupId: string;
  daoName: string;
  posts: ForumPostPreview[];
  comments?: ForumCommentPreview[];
  currentUserId?: string | null;
  isLoading?: boolean;
  isCommentsLoading?: boolean;
  error?: string | null;
  commentsError?: string | null;
  mutationError?: string | null;
  commentSort?: ForumThreadSort;
  isUpdatingPost?: boolean;
  isDeletingPost?: boolean;
  onCreatePost?: () => void;
  onSubmitPost?: (payload: PostSubmitPayload) => Promise<void> | void;
  onUpdatePost?: (
    postId: string,
    payload: PostSubmitPayload,
  ) => Promise<void> | void;
  onDeletePost?: (postId: string) => Promise<boolean> | boolean;
  onSelectPost?: (postId: string | null) => void;
  onSubmitComment?: (
    postId: string,
    payload: CommentSubmitPayload,
  ) => Promise<void> | void;
  onCommentRefetch?: () => Promise<void>;
  onLikeComment?: (commentId: string) => void | Promise<void>;
  onCommentSortChange?: (sort: ForumThreadSort) => void;
  token?: string;
};

type PostTypeFilter = "All" | PostType;

const POST_TYPES: Array<{
  label: PostTypeFilter;
  icon: typeof List;
  iconClassName: string;
}> = [
  { label: "All", icon: List, iconClassName: "bg-purple-100 text-purple-700" },
  {
    label: "Announcement",
    icon: Megaphone,
    iconClassName: "bg-amber-100 text-amber-700",
  },
  {
    label: "Proposal",
    icon: Package,
    iconClassName: "bg-indigo-100 text-indigo-700",
  },
  {
    label: "Question",
    icon: CircleHelp,
    iconClassName: "bg-rose-100 text-rose-700",
  },
  {
    label: "Discussion",
    icon: MessageCircle,
    iconClassName: "bg-slate-100 text-slate-600",
  },
  {
    label: "Resource",
    icon: TagIcon,
    iconClassName: "bg-emerald-100 text-emerald-700",
  },
];

function PostPreview({
  post,
  onSelect,
}: {
  post: ForumPostPreview;
  onSelect?: () => void;
}) {
  return (
    <PostCard
      commentCount={post.commentCount}
      viewCount={post.viewCount}
      createdAt={{ label: post.createdAtLabel, dateTime: post.createdAt }}
      displayName={post.authorName}
      excerpt={post.excerpt}
      onSelect={onSelect}
      tags={post.tags}
      title={post.title}
      types={post.types}
      walletAddress={post.authorWallet}
    />
  );
}

export default function ForumPanel({
  daoGroupId,
  daoName,
  posts,
  comments = [],
  currentUserId = null,
  isLoading = false,
  isCommentsLoading = false,
  error = null,
  commentsError = null,
  mutationError = null,
  commentSort = "latest",
  isUpdatingPost = false,
  isDeletingPost = false,
  onCreatePost,
  onSubmitPost,
  onUpdatePost,
  onDeletePost,
  onSelectPost,
  onSubmitComment,
  onCommentRefetch,
  onLikeComment,
  onCommentSortChange,
  token,
}: ForumPanelProps) {
  const [query, setQuery] = useState("");
  const [postType, setPostType] = useState<PostTypeFilter>("All");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(
    null,
  );
  const [isComposerOpen, setIsComposerOpen] = useState(false);

  const ownedPosts = useMemo(
    () => posts.map((post) => withOwnPostCapability(post, currentUserId)),
    [currentUserId, posts],
  );

  const tags = useMemo(
    () => Array.from(new Set(ownedPosts.flatMap((post) => post.tags))),
    [ownedPosts],
  );

  const filteredPosts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = ownedPosts.filter((post) => {
      const matchesQuery =
        !normalizedQuery ||
        post.title.toLowerCase().includes(normalizedQuery) ||
        post.excerpt.toLowerCase().includes(normalizedQuery);
      const matchesType = postType === "All" || post.types.includes(postType);
      return matchesQuery && matchesType && (!unreadOnly || post.isUnread);
    });

    return [...filtered].sort((left, right) => {
      return Date.parse(right.createdAt) - Date.parse(left.createdAt);
    });
  }, [ownedPosts, postType, query, unreadOnly]);

  const pinnedPosts = filteredPosts.filter((post) => post.isPinned);
  const regularPosts = filteredPosts.filter((post) => !post.isPinned);
  const selectedPost = ownedPosts.find((post) => post.id === selectedPostId);
  const selectedComments = useMemo(
    () => comments.filter((comment) => comment.postId === selectedPostId),
    [comments, selectedPostId],
  );
  const threadPost = selectedPost
    ? mapForumPostPreviewToThreadPost(selectedPost)
    : null;
  const threadComments = useMemo(
    () => buildForumThreadComments(selectedComments),
    [selectedComments],
  );
  const replyingToComment = selectedComments.find(
    (comment) => comment.id === replyingToCommentId,
  );
  const unreadCount = ownedPosts.filter((post) => post.isUnread).length;

  const selectPost = (postId: string) => {
    setReplyingToCommentId(null);
    setSelectedPostId(postId);
    onSelectPost?.(postId);
  };

  const closeThread = () => {
    setReplyingToCommentId(null);
    setSelectedPostId(null);
    onSelectPost?.(null);
  };

  const openComposer = () => {
    setIsComposerOpen(true);
    onCreatePost?.();
  };

  const submitPost = async (payload: PostSubmitPayload) => {
    try {
      await onSubmitPost?.(payload);
      // Only close modal after successful submission
      setIsComposerOpen(false);
    } catch (err) {
      // Keep modal open when submission fails so user can see error and retry
      // Error will be displayed by the composer component
      throw err;
    }
  };

  const submitComment = async (payload: CommentSubmitPayload) => {
    if (!selectedPost) return;
    await onSubmitComment?.(selectedPost.id, {
      ...payload,
      parentCommentId: replyingToCommentId ?? payload.parentCommentId,
    });
    setReplyingToCommentId(null);
  };

  const submitUpdatedPost = async (payload: PostSubmitPayload) => {
    if (!selectedPost) return;
    await onUpdatePost?.(selectedPost.id, payload);
  };

  const deleteSelectedPost = async () => {
    if (!selectedPost) return false;
    const deleted = await onDeletePost?.(selectedPost.id);
    if (deleted) {
      closeThread();
    }
    return Boolean(deleted);
  };

  if (threadPost) {
    return (
      <PostThread
        comments={threadComments}
        commentsError={commentsError}
        daoName={daoName}
        isDeletingPost={isDeletingPost}
        isLoadingComments={isCommentsLoading}
        isUpdatingPost={isUpdatingPost}
        mutationError={mutationError}
        onBack={closeThread}
        onCancelReply={() => setReplyingToCommentId(null)}
        onDeletePost={onDeletePost ? deleteSelectedPost : undefined}
        onLikeComment={onLikeComment}
        onReplyToComment={setReplyingToCommentId}
        onSortChange={onCommentSortChange}
        onSubmitComment={submitComment}
        onCommentRefetch={onCommentRefetch}
        onUpdatePost={onUpdatePost ? submitUpdatedPost : undefined}
        post={threadPost}
        token={token}
        replyingTo={
          replyingToComment
            ? {
                id: replyingToComment.id,
                authorName: replyingToComment.authorName,
              }
            : null
        }
        sort={commentSort}
      />
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <section className="rounded-2xl border border-purple-100 bg-white p-5 shadow-sm">
          <label
            className="mb-3 block text-xs font-bold uppercase tracking-wider text-slate-400"
            htmlFor="forum-search"
          >
            Search
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              id="forum-search"
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm text-slate-800 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search posts..."
              type="search"
              value={query}
            />
          </div>
        </section>

        <section className="rounded-2xl border border-purple-100 bg-white p-5 shadow-sm">
          <label className="flex cursor-pointer items-center justify-between gap-3 text-sm font-bold text-slate-700">
            <span className="flex items-center gap-3">
              <input
                checked={unreadOnly}
                className="h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                onChange={(event) => setUnreadOnly(event.target.checked)}
                type="checkbox"
              />
              Unread only
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
              {unreadCount}
            </span>
          </label>
        </section>

        <section className="rounded-2xl border border-purple-100 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
            Post type
          </h2>
          <div className="space-y-1">
            {POST_TYPES.map(({ label, icon: Icon, iconClassName }) => {
              const count =
                label === "All"
                  ? posts.length
                  : posts.filter((post) => post.types.includes(label)).length;
              const active = postType === label;
              return (
                <button
                  key={label}
                  aria-pressed={active}
                  className={`flex w-full items-center justify-between rounded-xl px-2 py-2 text-left text-sm font-bold transition ${active ? "bg-purple-100 text-purple-700" : "text-slate-600 hover:bg-slate-50"}`}
                  onClick={() => setPostType(label)}
                  type="button"
                >
                  <span className="flex items-center gap-2.5">
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconClassName}`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    {label}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${active ? "bg-purple-600 text-white" : "bg-slate-100 text-slate-400"}`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {tags.length > 0 && (
          <section className="rounded-2xl border border-purple-100 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
              Tags
            </h2>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="text-sm font-semibold text-slate-500"
                >
                  {tag}
                </span>
              ))}
            </div>
          </section>
        )}
      </aside>

      <main className="min-w-0">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-purple-600">
              Community forum
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-950 md:text-3xl">
              {daoName} Forum
            </h1>
            <p className="mt-1 text-sm font-semibold text-slate-400">
              {posts.length} posts <span className="mx-2">/</span> {unreadCount}{" "}
              unread
            </p>
          </div>
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-purple-700 to-violet-500 px-5 font-bold text-white shadow-lg shadow-purple-200 transition hover:from-purple-800 hover:to-violet-600"
            onClick={openComposer}
            type="button"
          >
            <Plus className="h-5 w-5" /> New Post
          </button>
        </header>

        {error && (
          <div
            className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700"
            role="alert"
          >
            {error}
          </div>
        )}
        {isComposerOpen && (
          <section className="mb-6" aria-label="Create a post">
            <PostEntryComposer
              className="border border-purple-200 shadow-sm"
              userId={currentUserId}
              daoGroupId={daoGroupId}
              daoName={daoName}
              onCancel={() => setIsComposerOpen(false)}
              onClose={() => setIsComposerOpen(false)}
              onSubmit={submitPost}
            />
          </section>
        )}
        {isLoading ? (
          <div className="space-y-4" aria-label="Loading forum posts">
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="h-40 animate-pulse rounded-2xl bg-purple-100/60"
              />
            ))}
          </div>
        ) : (
          <>
            {pinnedPosts.length > 0 && (
              <section className="mb-7" aria-labelledby="pinned-posts-heading">
                <h2
                  id="pinned-posts-heading"
                  className="mb-3 text-sm font-bold uppercase tracking-wider text-purple-600"
                >
                  Pinned
                </h2>
                <div className="space-y-4 rounded-2xl bg-purple-100/50 p-3">
                  {pinnedPosts.map((post) => (
                    <PostPreview
                      key={post.id}
                      post={post}
                      onSelect={() => selectPost(post.id)}
                    />
                  ))}
                </div>
              </section>
            )}

            <section aria-labelledby="forum-posts-heading">
              <h2 id="forum-posts-heading" className="sr-only">
                Forum posts
              </h2>
              {regularPosts.length > 0 ? (
                <div className="space-y-4">
                  {regularPosts.map((post) => (
                    <PostPreview
                      key={post.id}
                      post={post}
                      onSelect={() => selectPost(post.id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-purple-200 bg-white/70 px-6 py-12 text-center">
                  <p className="font-bold text-slate-700">
                    No posts match these filters.
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Try another search or post type.
                  </p>
                </div>
              )}
            </section>
          </>
        )}
        <p className="mt-6 text-xs text-slate-400">
          DAO group reference: {daoGroupId}
        </p>
      </main>
    </div>
  );
}
