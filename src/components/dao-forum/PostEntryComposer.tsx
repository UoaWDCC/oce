"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  X,
  Megaphone,
  HelpCircle,
  MessageCircle,
  Lightbulb,
  BookOpen,
  BarChart3,
  Plus,
  Trash2,
} from "lucide-react";
import {
  POST_TYPE,
  type PostSubmitPayload,
  type PostType,
} from "@app-types/dao-forum";
import ForumEntryComposer from "./ForumEntryComposer";
import { usePostDraft } from "@/features/chat-forum/hooks/usePostDraft";
import { CONTENT_LIMITS } from "../../features/chat-forum/lib/contentLimits";
import { useCharacterCount } from "../../features/chat-forum/hooks/useCharacterCount";
import { CharacterCounter } from "./CharacterCounter";
import { POLL_LIMITS } from "@/features/chat-forum/polls";
import type { PollSubmitPayload } from "@app-types/dao-forum";

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
  userId?: string | null;
  daoGroupId?: string;
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
  userId,
  daoGroupId,
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
  const { draft, isLoaded, saveDraft, clearDraft } = usePostDraft(
    isEditMode ? undefined : (userId ?? undefined),
    isEditMode ? undefined : daoGroupId,
  );
  const draftContextKey =
    !isEditMode && userId && daoGroupId ? `${userId}:${daoGroupId}` : null;
  const hydratedDraftKeyRef = useRef<string | null | undefined>(undefined);

  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [body, setBody] = useState(initialValues?.body ?? "");
  const [postType, setPostType] = useState<PostType>(
    initialValues?.postType ?? POST_TYPE.Discussion,
  );
  const [anonymous, setAnonymous] = useState(initialValues?.anonymous ?? false);
  const [isPinned, setIsPinned] = useState(initialValues?.isPinned ?? false);
  const [pollEnabled, setPollEnabled] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [pollError, setPollError] = useState<string | null>(null);
  const [titleError, setTitleError] = useState<string | null>(null);
  const titleCounter = useCharacterCount(title, "POST_TITLE");

  useEffect(() => {
    if (
      isEditMode ||
      !isLoaded ||
      hydratedDraftKeyRef.current === draftContextKey
    ) {
      return;
    }
    hydratedDraftKeyRef.current = draftContextKey;

    const savedPostType = Object.values(POST_TYPE).includes(
      draft?.postType as PostType,
    )
      ? (draft?.postType as PostType)
      : POST_TYPE.Discussion;
    setTitle(draft?.title ?? "");
    setBody(draft?.body ?? "");
    setPostType(savedPostType);
    setAnonymous(draft?.anonymous ?? false);
    setIsPinned(draft?.isPinned ?? false);
    setPollEnabled(Boolean(draft?.poll));
    setPollQuestion(draft?.poll?.question ?? "");
    setPollOptions(draft?.poll?.options ?? ["", ""]);
    setAllowMultiple(draft?.poll?.allowMultiple ?? false);
  }, [draft, draftContextKey, isEditMode, isLoaded]);

  const persistDraft = (updates: {
    title?: string;
    body?: string;
    postType?: PostType;
    anonymous?: boolean;
    isPinned?: boolean;
    poll?: PollSubmitPayload | null;
  }) => {
    if (isEditMode) return;
    saveDraft({
      title: updates.title ?? title,
      body: updates.body ?? body,
      postType: updates.postType ?? postType,
      anonymous: updates.anonymous ?? anonymous,
      isPinned: updates.isPinned ?? isPinned,
      imageUrl: draft?.imageUrl,
      poll:
        updates.poll === null
          ? undefined
          : (updates.poll ??
            (pollEnabled
              ? {
                  question: pollQuestion,
                  options: pollOptions,
                  allowMultiple,
                }
              : undefined)),
    });
  };

  const handleBodyChange = (newBody: string) => {
    setBody(newBody);
    persistDraft({ body: newBody });
  };

  const handleSubmit = async (data: {
    body: string;
    imageUrl?: string | null;
  }) => {
    setTitleError(null);
    setPollError(null);

    if (!title.trim()) {
      setTitleError("Title is required");
      throw new Error("Title is required");
    }

    if (titleCounter.isOverLimit) {
      setTitleError(
        `Title must be ${CONTENT_LIMITS.POST_TITLE} characters or fewer`,
      );
      throw new Error("Title too long");
    }

    let poll: PollSubmitPayload | undefined;
    if (pollEnabled) {
      const question = pollQuestion.trim();
      const options = pollOptions.map((option) => option.trim());
      if (!question || question.length > POLL_LIMITS.QUESTION) {
        setPollError(
          `Poll question is required and must be ${POLL_LIMITS.QUESTION} characters or fewer`,
        );
        throw new Error("Invalid poll question");
      }
      if (
        options.length < POLL_LIMITS.MIN_OPTIONS ||
        options.length > POLL_LIMITS.MAX_OPTIONS ||
        options.some((option) => !option || option.length > POLL_LIMITS.OPTION)
      ) {
        setPollError(
          `Add ${POLL_LIMITS.MIN_OPTIONS}-${POLL_LIMITS.MAX_OPTIONS} non-empty options`,
        );
        throw new Error("Invalid poll options");
      }
      if (
        new Set(options.map((option) => option.toLocaleLowerCase())).size !==
        options.length
      ) {
        setPollError("Poll options must be unique");
        throw new Error("Duplicate poll options");
      }
      poll = {
        question,
        options,
        allowMultiple,
      };
    }

    try {
      await onSubmit({
        title: title.trim(),
        body: data.body,
        postType,
        anonymous,
        isPinned,
        imageUrl: data.imageUrl,
        poll,
      });

      if (!isEditMode) {
        clearDraft();
        setTitle("");
        setBody("");
        setPostType(POST_TYPE.Discussion);
        setAnonymous(false);
        setIsPinned(false);
        setPollEnabled(false);
        setPollQuestion("");
        setPollOptions(["", ""]);
        setAllowMultiple(false);
      }
    } catch (err) {
      throw err;
    }
  };

  const handleCancel = () => {
    if (!isEditMode) clearDraft();
    onCancel?.();
  };

  const postTypes = Object.values(POST_TYPE);

  if (!isEditMode && !isLoaded) return null;

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
          <div className="mb-2 flex items-center justify-between">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Post Title
            </label>
            <CharacterCounter
              count={titleCounter.count}
              limit={titleCounter.limit}
              isOverLimit={titleCounter.isOverLimit}
              isNearLimit={titleCounter.isNearLimit}
            />
          </div>
          <input
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              persistDraft({ title: e.target.value });
            }}
            maxLength={CONTENT_LIMITS.POST_TITLE + 10} // allow slight overage so user sees error
            placeholder="Enter a descriptive title..."
            disabled={disabled}
            className={classNames(
              "w-full rounded-lg border px-4 py-3 text-sm",
              titleCounter.isOverLimit
                ? "border-red-400 focus:border-red-500 focus:ring-red-500"
                : "border-slate-200 focus:border-violet-500 focus:ring-violet-500",
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
                  onClick={() => {
                    setPostType(type);
                    persistDraft({ postType: type });
                  }}
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
                  onChange={(e) => {
                    setAnonymous(e.target.checked);
                    persistDraft({ anonymous: e.target.checked });
                  }}
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
                  onChange={(e) => {
                    setIsPinned(e.target.checked);
                    persistDraft({ isPinned: e.target.checked });
                  }}
                  disabled={disabled}
                  className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                />
                Pin post
              </label>
            )}
          </div>
        )}

        {!isEditMode && (
          <section className="rounded-xl border border-violet-100 bg-violet-50/50 p-4">
            <label className="flex items-center gap-3 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={pollEnabled}
                onChange={(event) => {
                  const enabled = event.target.checked;
                  setPollEnabled(enabled);
                  persistDraft({
                    poll: enabled
                      ? {
                          question: pollQuestion,
                          options: pollOptions,
                          allowMultiple,
                        }
                      : null,
                  });
                }}
                className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
              />
              <BarChart3 className="h-4 w-4 text-violet-600" />
              Add a poll
            </label>

            {pollEnabled && (
              <div className="mt-4 space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Poll question
                  </label>
                  <input
                    value={pollQuestion}
                    maxLength={POLL_LIMITS.QUESTION}
                    onChange={(event) => {
                      setPollQuestion(event.target.value);
                      persistDraft({
                        poll: {
                          question: event.target.value,
                          options: pollOptions,
                          allowMultiple,
                        },
                      });
                    }}
                    placeholder="What should the DAO do?"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100"
                  />
                </div>

                <div className="space-y-2">
                  {pollOptions.map((option, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        value={option}
                        maxLength={POLL_LIMITS.OPTION}
                        aria-label={`Poll option ${index + 1}`}
                        onChange={(event) => {
                          const nextOptions = pollOptions.map(
                            (item, itemIndex) =>
                              itemIndex === index ? event.target.value : item,
                          );
                          setPollOptions(nextOptions);
                          persistDraft({
                            poll: {
                              question: pollQuestion,
                              options: nextOptions,
                              allowMultiple,
                            },
                          });
                        }}
                        placeholder={`Option ${index + 1}`}
                        className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100"
                      />
                      {pollOptions.length > POLL_LIMITS.MIN_OPTIONS && (
                        <button
                          type="button"
                          aria-label={`Remove option ${index + 1}`}
                          onClick={() => {
                            const nextOptions = pollOptions.filter(
                              (_, itemIndex) => itemIndex !== index,
                            );
                            setPollOptions(nextOptions);
                            persistDraft({
                              poll: {
                                question: pollQuestion,
                                options: nextOptions,
                                allowMultiple,
                              },
                            });
                          }}
                          className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  {pollOptions.length < POLL_LIMITS.MAX_OPTIONS && (
                    <button
                      type="button"
                      onClick={() => {
                        const nextOptions = [...pollOptions, ""];
                        setPollOptions(nextOptions);
                        persistDraft({
                          poll: {
                            question: pollQuestion,
                            options: nextOptions,
                            allowMultiple,
                          },
                        });
                      }}
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-violet-700 hover:text-violet-900"
                    >
                      <Plus className="h-4 w-4" /> Add option
                    </button>
                  )}
                </div>

                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={allowMultiple}
                    onChange={(event) => {
                      setAllowMultiple(event.target.checked);
                      persistDraft({
                        poll: {
                          question: pollQuestion,
                          options: pollOptions,
                          allowMultiple: event.target.checked,
                        },
                      });
                    }}
                    className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                  />
                  Allow voters to select multiple options
                </label>

                {pollError && (
                  <p className="text-sm text-red-600" role="alert">
                    {pollError}
                  </p>
                )}
              </div>
            )}
          </section>
        )}

        <ForumEntryComposer
          onChange={isEditMode ? undefined : handleBodyChange}
          placeholder="Write your post content here..."
          submitLabel={isEditMode ? "Save changes" : "Publish Post"}
          onSubmit={handleSubmit}
          onCancel={onCancel ? handleCancel : undefined}
          disabled={disabled}
          showCancelButton={!!onCancel}
          variant="full"
          initialBody={isEditMode ? initialValues?.body : body}
          initialImageUrl={initialValues?.imageUrl}
        />
      </div>
    </div>
  );
}
