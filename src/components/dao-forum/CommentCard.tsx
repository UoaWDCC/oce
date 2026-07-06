"use client";

import React from "react";
import { Heart, Reply, Trash2 } from "lucide-react";
import StudentAvatar, { Timestamp } from "@/components/common/StudentAvatar";

export type CommentCardProps = {
  displayName: string;
  walletAddress?: string | null;
  profileImageUrl?: string | null;
  avatarColor?: string;
  badges?: React.ReactNode;
  timestamp: Timestamp;
  body: string;
  likeCount?: number;
  isLiked?: boolean;
  onLike?: () => void;
  onReply?: () => void;
  onDelete?: () => void;
  className?: string;
};

function classNames(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function CommentCard({
  displayName,
  walletAddress,
  profileImageUrl,
  avatarColor,
  badges,
  timestamp,
  body,
  likeCount = 0,
  isLiked = false,
  onLike,
  onReply,
  onDelete,
  className = "",
}: CommentCardProps) {
  return (
    <article
      className={classNames(
        "flex flex-col gap-3 rounded-lg border border-slate-200 border-l-4 border-l-indigo-500 bg-white p-4 shadow-sm",
        className,
      )}
    >
      <StudentAvatar
        avatarColor={avatarColor}
        badges={badges}
        displayName={displayName}
        profileImageUrl={profileImageUrl}
        size="sm"
        timestamp={timestamp}
        walletAddress={walletAddress}
      />

      <p className="mb-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
        {body}
      </p>

      <div className="flex items-center gap-4">
        {onLike && (
          <button
            aria-label={isLiked ? "Unlike comment" : "Like comment"}
            aria-pressed={isLiked}
            type="button"
            onClick={onLike}
            className="flex items-center gap-1 text-sm font-semibold text-slate-600 transition-colors hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
          >
            <Heart
              aria-hidden="true"
              className={classNames(
                "h-5 w-5",
                isLiked && "fill-red-600 text-red-600",
              )}
            />
            {likeCount > 0 && <span>{likeCount}</span>}
          </button>
        )}

        {onReply && (
          <button
            aria-label="Reply to comment"
            type="button"
            onClick={onReply}
            className="flex items-center gap-1 text-sm font-semibold text-slate-600 transition-colors hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            <Reply aria-hidden="true" className="h-5 w-5" />
            Reply
          </button>
        )}

        {onDelete && (
          <button
            aria-label="Delete comment"
            type="button"
            onClick={onDelete}
            className="shrink-0 text-slate-400 transition-colors hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
          >
            <Trash2 aria-hidden="true" className="h-5 w-5" />
          </button>
        )}
      </div>
    </article>
  );
}
