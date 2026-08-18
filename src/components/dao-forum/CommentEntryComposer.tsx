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
  autoFocus?: boolean;
  initialBody?: string;
  onCancel?: () => void;
};

export default function CommentEntryComposer({
  parentCommentId,
  onSubmit,
  disabled = false,
  showAttachment = false,
  className = "",
  autoFocus = false,
  initialBody,
  onCancel,
}: CommentEntryComposerProps) {
  const handleSubmit = async (data: {
    body: string;
    imageUrl?: string | null;
  }) => {
    await onSubmit({
      body: data.body,
      imageUrl: data.imageUrl ?? undefined,
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
      autoFocus={autoFocus}
      initialBody={initialBody}
      onCancel={onCancel}
      showCancelButton={!!onCancel}
    />
  );
}
