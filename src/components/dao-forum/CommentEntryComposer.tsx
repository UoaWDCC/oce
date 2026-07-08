"use client";

import React from "react";
import type { CommentSubmitPayload } from "@app-types/dao-forum";
import ForumEntryComposer from "./ForumEntryComposer";

export type CommentEntryComposerProps = {
  parentCommentId?: string;
  onSubmit: (payload: CommentSubmitPayload) => Promise<void>;
  disabled?: boolean;
  showAttachment?: boolean;
  className?: string;
};

export default function CommentEntryComposer({
  parentCommentId,
  onSubmit,
  disabled = false,
  showAttachment = false,
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
      showAttachButton={showAttachment}
    />
  );
}
