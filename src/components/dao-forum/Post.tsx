"use client";

import Link from "next/link";
import React from "react";
import Tag from "./Tag";
import StudentAvatar, { Timestamp } from "../common/StudentAvatar";
import { PostType } from "@app-types/post_types";

export type PostCardProps = {
  daoId: string;
  title: string;
  types?: PostType[];
  displayName: string;
  walletAddress?: string | null;
  profileImageUrl?: string | null;
  createdAt: Timestamp;
  commentCount: number;
  href?: string;
  onSelect?: () => void;
  className?: string;
};

function classNames(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function PostCardContent({
  daoId,
  title,
  types,
  displayName,
  walletAddress,
  profileImageUrl,
  createdAt,
  commentCount,
}: Omit<PostCardProps, "href" | "onSelect" | "className">) {
  const commentLabel = `${commentCount} ${
    commentCount === 1 ? "comment" : "comments"
  }`;

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-3">
      {types && types.length > 0 && (
        <div className="flex flex-row flex-wrap items-center gap-2">
          {types.map((type) => (
            <Tag key={type} type={type} />
          ))}
        </div>
      )}

      <h3 className="text-lg font-semibold leading-snug text-slate-950">
        {title}
      </h3>

      <StudentAvatar
        displayName={displayName}
        walletAddress={walletAddress}
        profileImageUrl={profileImageUrl}
        timestamp={createdAt}
        size="sm"
      />

      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs font-semibold text-slate-500">
        <span className="min-w-0 truncate">{daoId}</span>
        <span className="shrink-0">{commentLabel}</span>
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
    "flex items-start gap-4 rounded-lg border border-slate-200 bg-white px-5 py-4 text-left shadow-sm transition-colors",
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
