"use client";

import React, { useState } from "react";
import {
  X,
  Megaphone,
  HelpCircle,
  MessageCircle,
  Lightbulb,
  BookOpen,
} from "lucide-react";
import {
  POST_TYPE,
  type PostSubmitPayload,
  type PostType,
} from "@app-types/dao-forum";
import ForumEntryComposer from "./ForumEntryComposer";

const POST_TYPE_CONFIG: Record<
  PostType,
  { icon: typeof Megaphone; bgColor: string }
> = {
  [POST_TYPE.Announcement]: {
    icon: Megaphone,
    bgColor: "bg-amber-400",
  },
  [POST_TYPE.Proposal]: {
    icon: Lightbulb,
    bgColor: "bg-sky-400",
  },
  [POST_TYPE.Question]: {
    icon: HelpCircle,
    bgColor: "bg-rose-400",
  },
  [POST_TYPE.Discussion]: {
    icon: MessageCircle,
    bgColor: "bg-purple-400",
  },
  [POST_TYPE.Resource]: {
    icon: BookOpen,
    bgColor: "bg-emerald-400",
  },
};

export type PostComposerInitialValues = {
  title?: string;
  body?: string;
  postType?: PostType;
  anonymous?: boolean;
  isPinned?: boolean;
  imageUrl?: string | null;
};

export type PostEntryComposerProps = {
  daoName?: string;
  onSubmit: (payload: PostSubmitPayload) => Promise<void>;
  onCancel?: () => void;
  onClose?: () => void;
  showAnonymousToggle?: boolean;
  showPinnedToggle?: boolean;
  disabled?: boolean;
  className?: string;
  mode?: "create" | "edit";
  initialValues?: PostComposerInitialValues;
};

function classNames(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function PostEntryComposer({
  daoName = "the DAO",
  onSubmit,
  onCancel,
  onClose,
  showAnonymousToggle = true,
  showPinnedToggle = false,
  disabled = false,
  className = "",
  mode = "create",
  initialValues,
}: PostEntryComposerProps) {
  const isEditMode = mode === "edit";
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [postType, setPostType] = useState<PostType>(
    initialValues?.postType ?? POST_TYPE.Discussion,
  );
  const [anonymous, setAnonymous] = useState(initialValues?.anonymous ?? false);
  const [isPinned, setIsPinned] = useState(initialValues?.isPinned ?? false);
  const [titleError, setTitleError] = useState<string | null>(null);

  const handleSubmit = async (data: {
    body: string;
    imageUrl?: string | null;
  }) => {
    setTitleError(null);

    if (!title.trim()) {
      setTitleError("Title is required");
      throw new Error("Title is required");
    }

    try {
      await onSubmit({
        title: title.trim(),
        body: data.body,
        postType,
        anonymous,
        isPinned,
        imageUrl: data.imageUrl,
      });

      // Only clear form after successful submission
      if (!isEditMode) {
        setTitle("");
        setPostType(POST_TYPE.Discussion);
        setAnonymous(false);
        setIsPinned(false);
      }
    } catch (err) {
      // Keep form data when submission fails so user can retry
      // Error will be caught and displayed by ForumEntryComposer
      throw err;
    }
  };

  const postTypes = Object.values(POST_TYPE);

  return (
    <div
      className={classNames(
        "flex flex-col overflow-hidden rounded-2xl bg-white shadow-xl",
        className,
      )}
    >
      <header className="flex items-start justify-between bg-violet-600 px-6 py-5">
        <div>
          <h2 className="text-xl font-bold text-white">
            {isEditMode ? "Edit Post" : "New Post"}
          </h2>
          <p className="mt-1 text-sm text-violet-200">
            {isEditMode
              ? `Update your post in ${daoName}`
              : `Share with ${daoName} community`}
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-violet-200 transition-colors hover:bg-violet-500 hover:text-white"
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </button>
        )}
      </header>

      <div className="flex flex-col gap-5 p-6">
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Post Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter a descriptive title..."
            disabled={disabled}
            className={classNames(
              "w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500",
              disabled && "cursor-not-allowed opacity-50",
            )}
          />
          {titleError && (
            <p className="mt-1 text-sm text-red-600" role="alert">
              {titleError}
            </p>
          )}
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Post Type
          </label>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
            {postTypes.map((type) => {
              const config = POST_TYPE_CONFIG[type];
              const Icon = config.icon;
              const isSelected = postType === type;
              return (
                <button
                  key={type}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setPostType(type)}
                  disabled={disabled}
                  className={classNames(
                    "flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-colors",
                    isSelected
                      ? "border-violet-500 bg-violet-50"
                      : "border-slate-200 bg-white hover:border-slate-300",
                    disabled && "cursor-not-allowed opacity-50",
                  )}
                >
                  <span
                    className={classNames(
                      "flex h-10 w-10 items-center justify-center rounded-lg",
                      config.bgColor,
                    )}
                  >
                    <Icon className="h-5 w-5 text-white" />
                  </span>
                  <span
                    className={classNames(
                      "text-xs font-medium",
                      isSelected ? "text-violet-700" : "text-slate-700",
                    )}
                  >
                    {type}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {(showAnonymousToggle || showPinnedToggle) && (
          <div className="flex flex-wrap gap-4">
            {showAnonymousToggle && (
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={anonymous}
                  onChange={(e) => setAnonymous(e.target.checked)}
                  disabled={disabled}
                  className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                />
                Post anonymously
              </label>
            )}

            {showPinnedToggle && (
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  disabled={disabled}
                  className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                />
                Pin post
              </label>
            )}
          </div>
        )}

        <ForumEntryComposer
          placeholder="Write your post content here..."
          submitLabel={isEditMode ? "Save changes" : "Publish Post"}
          onSubmit={handleSubmit}
          onCancel={onCancel}
          disabled={disabled}
          showCancelButton={!!onCancel}
          variant="full"
          initialBody={initialValues?.body}
          initialImageUrl={initialValues?.imageUrl}
        />
      </div>
    </div>
  );
}
