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
import CommentCard from "@/components/dao-forum/CommentCard";
import PostCard from "@/components/dao-forum/Post";
import Tag from "@/components/dao-forum/Tag";
import type {
  ForumCommentPreview,
  ForumPostPreview,
  ForumPostType,
} from "../types";

type ForumPanelProps = {
  daoId: string;
  daoName: string;
  posts: ForumPostPreview[];
  comments?: ForumCommentPreview[];
  isLoading?: boolean;
  error?: string | null;
  onCreatePost?: () => void;
  onSelectPost?: (postId: string) => void;
  onLikeComment?: (commentId: string) => void;
  onReplyToComment?: (commentId: string) => void;
};

type PostTypeFilter = "All" | ForumPostType;
type SortOption = "Recent" | "Unanswered";

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

const SORT_OPTIONS: SortOption[] = ["Recent", "Unanswered"];

function PostPreview({
  post,
  onSelect,
}: {
  post: ForumPostPreview;
  onSelect?: () => void;
}) {
  return (
    <article className="rounded-2xl border border-purple-100 bg-white p-4 shadow-sm transition hover:border-purple-200 hover:shadow-md">
      <PostCard
        className="border-0 p-0 shadow-none hover:border-0"
        commentCount={post.commentCount}
        createdAt={{ label: post.createdAtLabel, dateTime: post.createdAt }}
        daoId={post.daoId}
        displayName={post.authorName}
        onSelect={onSelect}
        title={post.title}
        types={post.types}
        walletAddress={post.authorWallet}
      />
      <p className="mt-3 text-sm leading-6 text-slate-600">{post.excerpt}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {post.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700"
          >
            {tag}
          </span>
        ))}
      </div>
    </article>
  );
}

export default function ForumPanel({
  daoId,
  daoName,
  posts,
  comments = [],
  isLoading = false,
  error = null,
  onCreatePost,
  onSelectPost,
  onLikeComment,
  onReplyToComment,
}: ForumPanelProps) {
  const [query, setQuery] = useState("");
  const [postType, setPostType] = useState<PostTypeFilter>("All");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [sort, setSort] = useState<SortOption>("Recent");
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [isComposerOpen, setIsComposerOpen] = useState(false);

  const tags = useMemo(
    () => Array.from(new Set(posts.flatMap((post) => post.tags))),
    [posts],
  );

  const filteredPosts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = posts.filter((post) => {
      const matchesQuery =
        !normalizedQuery ||
        post.title.toLowerCase().includes(normalizedQuery) ||
        post.excerpt.toLowerCase().includes(normalizedQuery);
      const matchesType = postType === "All" || post.types.includes(postType);
      return matchesQuery && matchesType && (!unreadOnly || post.isUnread);
    });

    return [...filtered].sort((left, right) => {
      if (sort === "Unanswered") return left.commentCount - right.commentCount;
      return Date.parse(right.createdAt) - Date.parse(left.createdAt);
    });
  }, [postType, posts, query, sort, unreadOnly]);

  const pinnedPosts = filteredPosts.filter((post) => post.isPinned);
  const regularPosts = filteredPosts.filter((post) => !post.isPinned);
  const selectedPost = posts.find((post) => post.id === selectedPostId);
  const selectedComments = comments.filter(
    (comment) => comment.postId === selectedPostId,
  );
  const unreadCount = posts.filter((post) => post.isUnread).length;

  const selectPost = (postId: string) => {
    setSelectedPostId(postId);
    onSelectPost?.(postId);
  };

  const openComposer = () => {
    setIsComposerOpen(true);
    onCreatePost?.();
  };

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
          <section
            aria-labelledby="new-post-heading"
            className="mb-6 rounded-2xl border border-purple-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between gap-4">
              <h2
                id="new-post-heading"
                className="text-xl font-bold text-slate-950"
              >
                Create a post
              </h2>
              <button
                className="text-sm font-bold text-slate-500 hover:text-purple-700"
                onClick={() => setIsComposerOpen(false)}
                type="button"
              >
                Close
              </button>
            </div>
            <div className="mt-4 grid gap-4">
              <label className="grid gap-2 text-sm font-bold text-slate-700">
                Post type
                <select className="h-11 rounded-xl border border-slate-200 bg-white px-3 font-normal outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100">
                  {POST_TYPES.filter((type) => type.label !== "All").map(
                    (type) => (
                      <option key={type.label}>{type.label}</option>
                    ),
                  )}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-bold text-slate-700">
                Title
                <input
                  className="h-11 rounded-xl border border-slate-200 px-3 font-normal outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                  placeholder="What would you like to discuss?"
                />
              </label>
              <label className="grid gap-2 text-sm font-bold text-slate-700">
                Body
                <textarea
                  className="min-h-32 resize-y rounded-xl border border-slate-200 p-3 font-normal outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                  placeholder="Add context for DAO members..."
                />
              </label>
            </div>
            <button
              className="mt-4 rounded-full bg-slate-300 px-5 py-2 text-sm font-bold text-white"
              disabled
              type="button"
            >
              Publish post
            </button>
            <p className="mt-2 text-xs text-slate-400">
              Publishing will be enabled when the create-post API handler is
              connected.
            </p>
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
              <div className="mb-5 flex gap-6 overflow-x-auto border-b border-purple-100">
                {SORT_OPTIONS.map((option) => (
                  <button
                    key={option}
                    aria-pressed={sort === option}
                    className={`shrink-0 border-b-4 px-1 pb-3 text-sm font-bold ${sort === option ? "border-purple-600 text-purple-700" : "border-transparent text-slate-400 hover:text-slate-600"}`}
                    onClick={() => setSort(option)}
                    type="button"
                  >
                    {option}
                  </button>
                ))}
              </div>
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

            {selectedPost && (
              <section
                className="mt-8 rounded-2xl border border-purple-100 bg-purple-50/50 p-4 sm:p-6"
                aria-labelledby="discussion-heading"
              >
                <div className="mb-5 flex flex-wrap items-center gap-2">
                  <h2
                    id="discussion-heading"
                    className="mr-auto text-xl font-bold text-slate-950"
                  >
                    Discussion preview
                  </h2>
                  {selectedPost.types.map((type) => (
                    <Tag key={type} type={type} />
                  ))}
                </div>
                <p className="mb-5 text-sm text-slate-600">
                  Comment rendering slot for{" "}
                  <span className="font-bold">{selectedPost.title}</span>
                </p>
                {selectedComments.length > 0 ? (
                  <div className="space-y-3">
                    {selectedComments.map((comment) => (
                      <CommentCard
                        key={comment.id}
                        body={comment.body}
                        displayName={comment.authorName}
                        isLiked={comment.isLiked}
                        likeCount={comment.likeCount}
                        onLike={
                          onLikeComment
                            ? () => onLikeComment(comment.id)
                            : undefined
                        }
                        onReply={
                          onReplyToComment
                            ? () => onReplyToComment(comment.id)
                            : undefined
                        }
                        timestamp={{
                          label: comment.createdAtLabel,
                          dateTime: comment.createdAt,
                        }}
                        walletAddress={comment.authorWallet}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-purple-200 bg-white p-6 text-center text-sm font-semibold text-slate-500">
                    No comments yet. API-loaded comments will render here.
                  </div>
                )}
                <div className="mt-4 rounded-xl border border-purple-100 bg-white p-4">
                  <label
                    className="text-sm font-bold text-slate-700"
                    htmlFor="comment-template"
                  >
                    Add a comment
                  </label>
                  <textarea
                    id="comment-template"
                    className="mt-2 min-h-24 w-full resize-y rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                    placeholder="Share your response..."
                  />
                  <button
                    className="mt-3 rounded-full bg-purple-600 px-5 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                    disabled
                    type="button"
                  >
                    Post comment
                  </button>
                  <p className="mt-2 text-xs text-slate-400">
                    Submission will be enabled when the comment API handler is
                    connected.
                  </p>
                </div>
              </section>
            )}
          </>
        )}
        <p className="mt-6 text-xs text-slate-400">DAO reference: {daoId}</p>
      </main>
    </div>
  );
}
