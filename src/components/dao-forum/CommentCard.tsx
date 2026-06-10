"use client";

import React from "react";
import { Heart, Reply, Trash2 } from "lucide-react";
import StudentAvatar from "@/components/common/StudentAvatar";

type CommentCardProps = {
  username: string;
  userInitials?: string;
  timestamp: string;
  body: string;
  likeCount?: number;
  isLiked?: boolean;
  onLike?: () => void;
  onReply?: () => void;
  onDelete?: () => void;
  className?: string;
};

export default function CommentCard({
  username,
  userInitials,
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
    <div className={`flex flex-col gap-3 p-4 bg-white border-l-4 border-purple-500 rounded-lg shadow-sm ${className}`}>
      {/* Header - Avatar, Username, Timestamp */}
      <StudentAvatar
        displayName={username}
        size="sm"
        timestamp={{ label: timestamp, dateTime: timestamp }}
      />

      {/* Comment Body */}
      <p className="text-gray-700 mb-3 whitespace-pre-wrap">{body}</p>

      {/* Action Buttons */}
      <div className="flex items-center gap-4">
        {onLike && (
          <button
            onClick={onLike}
            className="flex items-center gap-1 text-sm text-gray-600 hover:text-red-600 transition-colors"
          >
            <Heart
              className={`w-5 h-5 ${isLiked ? 'fill-red-600 text-red-600' : ''}`}
            />
            {likeCount > 0 && <span>{likeCount}</span>}
          </button>
        )}

        {onReply && (
          <button
            onClick={onReply}
            className="flex items-center gap-1 text-sm text-gray-600 hover:text-purple-600 transition-colors"
          >
            <Reply className="w-5 h-5" />
            Reply
          </button>
        )}

        {onDelete && (
          <button
            onClick={onDelete}
            className="flex-shrink-0 text-gray-400 hover:text-red-600 transition-colors"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}
