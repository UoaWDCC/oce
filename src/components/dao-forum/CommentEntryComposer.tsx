"use client";

import React from "react";
import ForumEntryComposer from "./ForumEntryComposer";

export type CommentSubmitPayload = {
  body: string;
  imageUrl?: string;
  parentCommentId?: string;
};

export type CommentEntryComposerProps = {
  parentCommentId?: string;
  onSubmit: (payload: CommentSubmitPayload) => Promise<void>;
  disabled?: boolean;
  className?: string;
};

export default function CommentEntryComposer({
  parentCommentId,
  onSubmit,
  disabled = false,
  className = "",
}: CommentEntryComposerProps) {
  const handleSubmit = async (data: { body: string; imageUrl?: string }) => {
    await onSubmit({
      body: data.body,
      imageUrl: data.imageUrl,
      parentCommentId,
    });
  };

  return (
    <ForumEntryComposer
      placeholder="Add a comment..."
      submitLabel="Reply"
      onSubmit={handleSubmit}
      disabled={disabled}
      className={className}
    />
  );
}
