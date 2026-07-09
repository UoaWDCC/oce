"use client";

import { StudentAvatar } from "@/components/common";
import { Timestamp } from "@/components/common/StudentAvatar";
import type { ReactNode } from "react";
import PostCard from "@/components/dao-forum/Post";
import { POST_TYPE } from "@app-types/dao-forum";
import CommentCard from "@/components/dao-forum/CommentCard";
import CommentEntryComposer from "@/components/dao-forum/CommentEntryComposer";
import PostEntryComposer from "@/components/dao-forum/PostEntryComposer";
import { ForumPanel } from "@/features/chat-forum";
import {
  mockForumCommentPreviews,
  mockForumPostPreviews,
} from "@/features/chat-forum/mocks";

type PreviewPost = {
  id: string;
  daoId: string;
  title: string;
  body: string;
  authorId: string;
  createdAt: string;
};

type PreviewComment = {
  id: string;
  postId: string;
  body: string;
  authorId: string;
  createdAt: string;
};

const previewPosts: PreviewPost[] = [
  {
    id: "post-1",
    daoId: "dao-education",
    title: "How should we structure the next learning module?",
    body: "This placeholder shows the expected shape for a forum post component before the real component exists.",
    authorId: "0x8f120B15a672A97C86aC1E3D910B8512b8a14a90",
    createdAt: "2026-05-29T09:30:00.000Z",
  },
  {
    id: "post-2",
    daoId: "dao-education",
    title: "Proposal review checklist",
    body: "Use this slot to preview loading, empty, error, and populated forum states as the feature develops.",
    authorId: "0x41ca932f71DAb2870E9d118492e5d33F7c8691e3",
    createdAt: "2026-05-30T14:10:00.000Z",
  },
];

const previewComments: PreviewComment[] = [
  {
    id: "comment-1",
    postId: "post-1",
    body: "The worked example would help newer members compare approaches before voting.",
    authorId: "0x1d05f97A59231F2ecF1A2FA980E58392B8d8c782",
    createdAt: "2026-05-29T10:45:00.000Z",
  },
  {
    id: "comment-2",
    postId: "post-1",
    body: "Can we also include a short quiz at the end of each module?",
    authorId: "0x77be19f504cB7E859D3157775F1B12c50E1a02dd",
    createdAt: "2026-05-29T12:05:00.000Z",
  },
];

const previewAuthors: Record<
  string,
  {
    displayName: string;
    profileImageUrl?: string;
    avatarColor?: string;
    badges?: ReactNode;
  }
> = {
  "0x8f120B15a672A97C86aC1E3D910B8512b8a14a90": {
    displayName: "Jordan S.",
    avatarColor: "#7c3aed",
  },
  "0x41ca932f71DAb2870E9d118492e5d33F7c8691e3": {
    displayName: "Mia Chen",
    profileImageUrl: "/images/jayden-hunt.png",
  },
  "0x1d05f97A59231F2ecF1A2FA980E58392B8d8c782": {
    displayName: "Dr. Rivera",
    avatarColor: "#7c3aed",
    badges: (
      <span className="rounded-full bg-[#7c3aed] px-2 py-0.5 text-xs font-bold leading-none text-white">
        Staff
      </span>
    ),
  },
  "0x77be19f504cB7E859D3157775F1B12c50E1a02dd": {
    displayName: "Anonymous",
    avatarColor: "#10b981",
  },
};

function createTimestamp(value: string): Timestamp {
  return {
    label: formatDate(value),
    dateTime: value,
  };
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function getPreviewAuthor(walletAddress: string) {
  return (
    previewAuthors[walletAddress] ?? {
      displayName: "Student",
    }
  );
}

function PlaceholderPostCard({
  post,
  commentCount,
}: {
  post: PreviewPost;
  commentCount: number;
}) {
  const author = getPreviewAuthor(post.authorId);

  return (
    <PostCard
      daoId={post.daoId}
      title={post.title}
      types={[POST_TYPE.Discussion]}
      displayName={author.displayName}
      walletAddress={post.authorId}
      profileImageUrl={author.profileImageUrl}
      createdAt={createTimestamp(post.createdAt)}
      commentCount={commentCount}
      onSelect={() => console.log(`Open post ${post.id}`)}
    />
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

        <section className="rounded-2xl border border-purple-100 bg-gradient-to-br from-slate-50 to-purple-50 p-4 shadow-sm sm:p-6">
          <ForumPanel
            comments={mockForumCommentPreviews}
            daoId="0x333B47F13128A1225A434d9f403A3e850B0B48D"
            daoName="WDCC DAO"
            posts={mockForumPostPreviews}
          />
        </section>

        <section className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Student Avatar</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg bg-slate-50 p-5">
              <StudentAvatar
                avatarColor="#7c3aed"
                displayName="Jordan S."
                size="lg"
                walletAddress="0x8f120B15a672A97C86aC1E3D910B8512b8a14a90"
              />
            </div>
            <div className="rounded-lg bg-slate-50 p-5">
              <StudentAvatar
                displayName="Mia Chen"
                profileImageUrl="/images/jayden-hunt.png"
                size="md"
                walletAddress="0x41ca932f71DAb2870E9d118492e5d33F7c8691e3"
              />
            </div>
            <div className="rounded-lg bg-slate-50 p-5">
              <StudentAvatar
                avatarColor="#10b981"
                badges={
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold leading-none text-emerald-800">
                    Endorsed
                  </span>
                }
                displayName="Anonymous"
                size="sm"
                walletAddress="0x77be19f504cB7E859D3157775F1B12c50E1a02dd"
              />
            </div>
            <div className="rounded-lg bg-slate-50 p-5">
              <StudentAvatar
                avatarColor="#f59e0b"
                displayName="Kai L."
                size="sm"
                walletAddress="0x2fE394b7eE1D240241709672F78A1e4Dd4BD11a7"
                walletAddressDisplay="full"
              />
            </div>
          </div>
        </section>

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
            {firstPostComments.map((comment) => {
              const author = getPreviewAuthor(comment.authorId);
              return (
                <CommentCard
                  key={comment.id}
                  avatarColor={author.avatarColor}
                  badges={author.badges}
                  displayName={author.displayName}
                  profileImageUrl={author.profileImageUrl}
                  timestamp={createTimestamp(comment.createdAt)}
                  walletAddress={comment.authorId}
                  body={comment.body}
                  likeCount={0}
                  isLiked={false}
                  onLike={() => console.log(`Liked comment ${comment.id}`)}
                  onReply={() => console.log(`Reply to comment ${comment.id}`)}
                />
              );
            })}
          </div>
        </section>

        <section className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Comment Entry Composer</h2>
          <CommentEntryComposer
            showAttachment
            onSubmit={async (payload) => {
              console.log("Comment submitted:", payload);
              await new Promise((resolve) => setTimeout(resolve, 1000));
            }}
          />
        </section>

        <section className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Post Entry Composer</h2>
          <p className="text-sm text-slate-600">
            Full composer for creating new forum posts with title, type, and
            tags.
          </p>
          <div className="max-w-2xl">
            <PostEntryComposer
              daoName="WDCC DAO"
              onSubmit={async (payload) => {
                console.log("Post submitted:", payload);
                await new Promise((resolve) => setTimeout(resolve, 1000));
              }}
              onCancel={() => console.log("Cancelled")}
            />
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
