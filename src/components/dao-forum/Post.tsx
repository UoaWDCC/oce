"use client";

import Link from "next/link";
import React from "react";
import { MessageCircle } from "lucide-react";
import Tag from "./Tag";
import StudentAvatar, { Timestamp } from "../common/StudentAvatar";
import { forumContentToPlainText } from "@/utils/forumContent";
import type { PostType } from "@app-types/dao-forum";

export type PostCardProps = {
  title: string;
  types?: PostType[];
  displayName: string;
  walletAddress?: string | null;
  profileImageUrl?: string | null;
  createdAt: Timestamp;
  commentCount: number;
  excerpt?: string;
  tags?: string[];
  href?: string;
  onSelect?: () => void;
  className?: string;
};

function classNames(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function PostCardContent({
  title,
  types,
  displayName,
  walletAddress,
  profileImageUrl,
  createdAt,
  commentCount,
  excerpt,
  tags = [],
}: Omit<PostCardProps, "href" | "onSelect" | "className">) {
  const commentLabel = `${commentCount} ${
    commentCount === 1 ? "comment" : "comments"
  }`;

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      {(types?.length || tags.length > 0) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {types?.map((type) => (
              <Tag key={type} type={type} />
            ))}
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <h3 className="text-xl font-bold leading-snug text-slate-950">{title}</h3>

      {excerpt && (
        <p
          className="mt-2 overflow-hidden text-sm leading-6 text-slate-600"
          style={{
            display: "-webkit-box",
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: 2,
          }}
        >
          {forumContentToPlainText(excerpt)}
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-end justify-between gap-3 border-t border-slate-100 pt-4">
        <StudentAvatar
          displayName={displayName}
          walletAddress={walletAddress}
          profileImageUrl={profileImageUrl}
          timestamp={createdAt}
          size="sm"
        />
        <span className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-slate-500">
          <MessageCircle aria-hidden="true" className="h-4 w-4" />
          {commentLabel}
        </span>
      </div>
    </div>
  );
}

const PostCard = ({
  href,
  onSelect,
  className,
  ...contentProps
}: PostCardProps) => {
  const cardClassName = classNames(
    "flex w-full items-start rounded-2xl border border-purple-100 bg-white p-5 text-left shadow-sm transition hover:border-purple-200 hover:shadow-md sm:p-6",
    (href || onSelect) &&
      "cursor-pointer hover:border-indigo-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2",
    className,
  );
  const content = <PostCardContent {...contentProps} />;

  if (href) {
    return (
      <Link className={cardClassName} href={href}>
        {content}
      </Link>
    );
  }

  if (onSelect) {
    return (
      <button className={cardClassName} onClick={onSelect} type="button">
        {content}
      </button>
    );
  }

  return <article className={cardClassName}>{content}</article>;
};

export default PostCard;
