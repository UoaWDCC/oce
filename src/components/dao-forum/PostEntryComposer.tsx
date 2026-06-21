"use client";

import React, { useState } from "react";
import { X, Megaphone, HelpCircle, MessageCircle, Package } from "lucide-react";
import ForumEntryComposer from "./ForumEntryComposer";

const POST_TYPES = [
  {
    id: "announcement",
    label: "Announcement",
    icon: Megaphone,
    bgColor: "bg-amber-400",
  },
  {
    id: "proposal",
    label: "Proposal",
    icon: Package,
    bgColor: "bg-cyan-400",
  },
  {
    id: "question",
    label: "Question",
    icon: HelpCircle,
    bgColor: "bg-red-400",
  },
  {
    id: "general",
    label: "General",
    icon: MessageCircle,
    bgColor: "bg-slate-500",
  },
] as const;

type PostTypeId = (typeof POST_TYPES)[number]["id"];

const DEFAULT_TAGS = [
  "Smart Contracts",
  "DeFi",
  "Governance",
  "Technical",
  "Tokenomics",
  "General",
];

export type PostSubmitPayload = {
  title: string;
  body: string;
  postType: PostTypeId;
  tags: string[];
  imageUrl?: string;
};

export type PostEntryComposerProps = {
  daoName?: string;
  onSubmit: (payload: PostSubmitPayload) => Promise<void>;
  onCancel?: () => void;
  onClose?: () => void;
  availableTags?: string[];
  disabled?: boolean;
  className?: string;
};

function classNames(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function PostEntryComposer({
  daoName = "the DAO",
  onSubmit,
  onCancel,
  onClose,
  availableTags = DEFAULT_TAGS,
  disabled = false,
  className = "",
}: PostEntryComposerProps) {
  const [title, setTitle] = useState("");
  const [postType, setPostType] = useState<PostTypeId>("general");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [titleError, setTitleError] = useState<string | null>(null);

  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const handleCreateTag = () => {
    const newTag = prompt("Enter new tag name:");
    if (newTag && newTag.trim() && !selectedTags.includes(newTag.trim())) {
      setSelectedTags((prev) => [...prev, newTag.trim()]);
    }
  };

  const handleSubmit = async (data: { body: string; imageUrl?: string }) => {
    setTitleError(null);

    if (!title.trim()) {
      setTitleError("Title is required");
      throw new Error("Title is required");
    }

    await onSubmit({
      title: title.trim(),
      body: data.body,
      postType,
      tags: selectedTags,
      imageUrl: data.imageUrl,
    });

    setTitle("");
    setPostType("general");
    setSelectedTags([]);
  };

  return (
    <div
      className={classNames(
        "flex flex-col overflow-hidden rounded-2xl bg-white shadow-xl",
        className,
      )}
    >
      <header className="flex items-start justify-between bg-violet-600 px-6 py-5">
        <div>
          <h2 className="text-xl font-bold text-white">New Post</h2>
          <p className="mt-1 text-sm text-violet-200">
            Share with {daoName} community
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
          <div className="grid grid-cols-4 gap-3">
            {POST_TYPES.map((type) => {
              const Icon = type.icon;
              const isSelected = postType === type.id;
              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setPostType(type.id)}
                  disabled={disabled}
                  className={classNames(
                    "flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors",
                    isSelected
                      ? "border-violet-500 bg-violet-50"
                      : "border-slate-200 bg-white hover:border-slate-300",
                    disabled && "cursor-not-allowed opacity-50",
                  )}
                >
                  <span
                    className={classNames(
                      "flex h-12 w-12 items-center justify-center rounded-lg",
                      type.bgColor,
                    )}
                  >
                    <Icon className="h-6 w-6 text-white" />
                  </span>
                  <span
                    className={classNames(
                      "text-sm font-medium",
                      isSelected ? "text-violet-700" : "text-slate-700",
                    )}
                  >
                    {type.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Tags
          </label>
          <div className="flex flex-wrap gap-2">
            {availableTags.map((tag) => {
              const isSelected = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleTagToggle(tag)}
                  disabled={disabled}
                  className={classNames(
                    "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                    isSelected
                      ? "border-violet-500 bg-violet-50 text-violet-700"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                    disabled && "cursor-not-allowed opacity-50",
                  )}
                >
                  {tag}
                </button>
              );
            })}
            <button
              type="button"
              onClick={handleCreateTag}
              disabled={disabled}
              className={classNames(
                "rounded-full border border-dashed border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-400 transition-colors hover:border-slate-400 hover:text-slate-500",
                disabled && "cursor-not-allowed opacity-50",
              )}
            >
              + Create tag
            </button>
          </div>
        </div>

        <ForumEntryComposer
          placeholder="Write your post content here..."
          submitLabel="Publish Post"
          onSubmit={handleSubmit}
          onCancel={onCancel}
          disabled={disabled}
          showCancelButton={!!onCancel}
          variant="full"
        />
      </div>
    </div>
  );
}
