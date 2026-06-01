"use client";

import React from "react";

interface CommentCardProps {
  username: string;
  userInitials?: string;
  isStaff?: boolean;
  isEndorsed?: boolean;
  timestamp: string;
  body: string;
  likeCount?: number;
  isLiked?: boolean;
  onLike?: () => void;
  onReply?: () => void;
  onDelete?: () => void;
  className?: string;
}

const CommentCard = ({
  username,
  userInitials,
  isStaff = false,
  isEndorsed = false,
  timestamp,
  body,
  likeCount = 0,
  isLiked = false,
  onLike,
  onReply,
  onDelete,
  className = "",
}: CommentCardProps) => {
  return (
    <div className={`flex gap-3 p-4 bg-white border-l-4 border-purple-500 rounded-lg shadow-sm ${className}`}>
      {/* Avatar Section */}
      <div className="flex-shrink-0">
        <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-semibold text-sm">
          {userInitials || username.substring(0, 2).toUpperCase()}
        </div>
      </div>

      {/* Main Content Section */}
      <div className="flex-1 min-w-0">
        {/* Header - Username, Badges, Timestamp */}
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold text-gray-900">{username}</span>

          {/* TODO: Add Staff Badge Icon */}
          {isStaff && (
            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-purple-100 text-purple-800">
              Staff
            </span>
          )}

          {/* TODO: Add Endorsed Badge Icon */}
          {isEndorsed && (
            <span className="flex items-center gap-1 text-xs font-semibold text-green-700">
              {/* Placeholder for endorsed icon */}
              <span className="w-4 h-4">[✓]</span>
              Endorsed
            </span>
          )}

          <span className="text-sm text-gray-500 ml-auto">{timestamp}</span>
        </div>

        {/* Comment Body */}
        <p className="text-gray-700 mb-3 whitespace-pre-wrap">{body}</p>

        {/* Action Buttons */}
        <div className="flex items-center gap-4">
          {/* TODO: Add Like Icon from /public/likeButton.svg */}
          {onLike && (
            <button
              onClick={onLike}
              className="flex items-center gap-1 text-sm text-gray-600 hover:text-red-600 transition-colors"
            >
              {/* Placeholder for like icon */}
              <span className="w-5 h-5">[♡]</span>
              {likeCount > 0 && <span>{likeCount}</span>}
            </button>
          )}

          {/* TODO: Add Reply Icon from /public/replyButton.svg */}
          {onReply && (
            <button
              onClick={onReply}
              className="flex items-center gap-1 text-sm text-gray-600 hover:text-purple-600 transition-colors"
            >
              {/* Placeholder for reply icon */}
              <span className="w-5 h-5">[↩]</span>
              Reply
            </button>
          )}
        </div>
      </div>

      {/* TODO: Add Delete Icon from /public/deleteButton.svg */}
      {onDelete && (
        <button
          onClick={onDelete}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
        >
          {/* Placeholder for delete icon */}
          <span className="w-5 h-5">[🗑]</span>
        </button>
      )}
    </div>
  );
};

export default CommentCard;
