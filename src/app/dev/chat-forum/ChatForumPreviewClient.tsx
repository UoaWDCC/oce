"use client";

import { ForumComment, ForumPost } from "@/features/chat-forum/types";

const previewPosts: ForumPost[] = [
  {
    id: "post-1",
    daoId: "dao-education",
    title: "How should we structure the next learning module?",
    body: "This placeholder shows the expected shape for a forum post component before the real component exists.",
    authorId: "0x8f12...4a90",
    createdAt: "2026-05-29T09:30:00.000Z",
  },
  {
    id: "post-2",
    daoId: "dao-education",
    title: "Proposal review checklist",
    body: "Use this slot to preview loading, empty, error, and populated forum states as the feature develops.",
    authorId: "0x41ca...91e3",
    createdAt: "2026-05-30T14:10:00.000Z",
  },
];

const previewComments: ForumComment[] = [
  {
    id: "comment-1",
    postId: "post-1",
    body: "The worked example would help newer members compare approaches before voting.",
    authorId: "0x1d05...c782",
    createdAt: "2026-05-29T10:45:00.000Z",
  },
  {
    id: "comment-2",
    postId: "post-1",
    body: "Can we also include a short quiz at the end of each module?",
    authorId: "0x77be...02dd",
    createdAt: "2026-05-29T12:05:00.000Z",
  },
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function PlaceholderPostCard({
  post,
  commentCount,
}: {
  post: ForumPost;
  commentCount: number;
}) {
  return (
    <article className="rounded-lg border border-dashed border-slate-300 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-medium text-slate-500">
        <span>{post.authorId}</span>
        <time dateTime={post.createdAt}>{formatDate(post.createdAt)}</time>
      </div>
      <h3 className="mt-3 text-lg font-semibold text-slate-950">
        {post.title}
      </h3>
      <p className="mt-2 text-sm leading-6 text-slate-700">{post.body}</p>
      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs font-semibold text-slate-500">
        <span>{post.daoId}</span>
        <span>{commentCount} comments</span>
      </div>
    </article>
  );
}

function PlaceholderCommentCard({ comment }: { comment: ForumComment }) {
  return (
    <article className="rounded-lg border border-dashed border-slate-300 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-medium text-slate-500">
        <span>{comment.authorId}</span>
        <time dateTime={comment.createdAt}>{formatDate(comment.createdAt)}</time>
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-700">{comment.body}</p>
    </article>
  );
}

function PlaceholderStateCard({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5">
      <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
    </div>
  );
}

export default function ChatForumPreviewClient() {
  const firstPostComments = previewComments.filter(
    (comment) => comment.postId === previewPosts[0].id,
  );

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-8 text-slate-950">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header>
          <p className="text-sm font-semibold uppercase tracking-wide text-[#5e00b2]">
            Development preview
          </p>
          <h1 className="mt-1 text-3xl font-bold">Chat Forum Components</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Placeholder preview route for upcoming chat-forum components. Swap
            these dashed placeholder cards for real feature components as they
            are added.
          </p>
        </header>

        <section className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Forum Posts</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {previewPosts.map((post) => (
              <PlaceholderPostCard
                key={post.id}
                post={post}
                commentCount={
                  previewComments.filter(
                    (comment) => comment.postId === post.id,
                  ).length
                }
              />
            ))}
          </div>
        </section>

        <section className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Forum Thread</h2>
          <PlaceholderPostCard
            post={previewPosts[0]}
            commentCount={firstPostComments.length}
          />
          <div className="grid gap-3 pl-4 md:pl-8">
            {firstPostComments.map((comment) => (
              <PlaceholderCommentCard key={comment.id} comment={comment} />
            ))}
          </div>
        </section>

        <section className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Expected States</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <PlaceholderStateCard
              title="Loading"
              body="Reserve this slot for loading skeletons or pending fetch states."
            />
            <PlaceholderStateCard
              title="Empty"
              body="Use this slot when the selected DAO has no posts or comments yet."
            />
            <PlaceholderStateCard
              title="Error"
              body="Use this slot for failed fetches, permission errors, or unavailable forum data."
            />
          </div>
        </section>
      </div>
    </main>
  );
}
