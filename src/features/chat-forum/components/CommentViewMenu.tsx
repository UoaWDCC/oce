"use client";
import React, { useEffect, useRef, useState } from "react";
import { Minus, Plus, SlidersHorizontal } from "lucide-react";
import type { ForumCommentFilter, ForumThreadSort } from "../types";
import {
  DEFAULT_COMMENT_FILTER,
  isCommentFilterActive,
  parseMinReactions,
} from "../lib/commentReactions";
import {
  SORT_OPTIONS,
  REACTIONS,
  REACTION_FILTER_OPTIONS,
} from "../lib/reactionPresentation";
import { classNames } from "../lib/classNames";

type CommentViewMenuProps = {
  sort: ForumThreadSort;
  filter: ForumCommentFilter;
  onSortChange?: (sort: ForumThreadSort) => void;
  onFilterChange?: (filter: ForumCommentFilter) => void;
};

/** Short description of the active view for the closed menu button. */
function describeCommentView(
  sort: ForumThreadSort,
  filter: ForumCommentFilter,
) {
  const sortLabel =
    SORT_OPTIONS.find((option) => option.value === sort)?.label ?? "";
  if (!isCommentFilterActive(filter)) return sortLabel;
  const emoji = REACTIONS.find(({ type }) => type === filter.reaction)?.emoji;
  const minimum =
    filter.reaction === "all" ? filter.minCount : Math.max(filter.minCount, 1);
  return `${sortLabel} · ${emoji ?? "All"} ≥${minimum}`;
}

/**
 * One button that opens the thread's sort and reaction filter in a panel, so
 * the replies header stays a single control however many options there are.
 * The panel is positioned against the header row rather than the button, so
 * it stays on screen when the header wraps on narrow viewports.
 */
export default function CommentViewMenu({
  sort,
  filter,
  onSortChange,
  onFilterChange,
}: CommentViewMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = React.useId();
  const isFiltered = isCommentFilterActive(filter);

  // Kept as text so the field can be cleared while typing; only valid
  // counts are sent on, and blurring restores the applied value.
  const [minCountInput, setMinCountInput] = useState(String(filter.minCount));
  const [appliedMinCount, setAppliedMinCount] = useState(filter.minCount);

  // Follow resets and URL changes during render, so the field never shows
  // a stale count for a frame.
  if (appliedMinCount !== filter.minCount) {
    setAppliedMinCount(filter.minCount);
    setMinCountInput(String(filter.minCount));
  }

  useEffect(() => {
    if (!isOpen) return;

    const handleDismiss = (event: KeyboardEvent | PointerEvent) => {
      if (event instanceof KeyboardEvent) {
        if (event.key !== "Escape") return;
        setIsOpen(false);
        buttonRef.current?.focus();
        return;
      }
      const target = event.target as Node;
      if (
        panelRef.current?.contains(target) ||
        buttonRef.current?.contains(target)
      ) {
        return;
      }
      setIsOpen(false);
    };

    document.addEventListener("keydown", handleDismiss);
    document.addEventListener("pointerdown", handleDismiss);
    return () => {
      document.removeEventListener("keydown", handleDismiss);
      document.removeEventListener("pointerdown", handleDismiss);
    };
  }, [isOpen]);

  const setMinCount = (minCount: number) => {
    if (minCount < 0 || minCount === filter.minCount) return;
    onFilterChange?.({ ...filter, minCount });
  };

  const optionClassName = (isSelected: boolean, disabled: boolean) =>
    classNames(
      "inline-flex cursor-pointer items-center justify-center gap-1 rounded-lg border px-3 py-1.5 text-sm font-semibold transition peer-focus-visible:ring-2 peer-focus-visible:ring-purple-500 peer-focus-visible:ring-offset-1",
      isSelected
        ? "border-purple-500 bg-purple-100 text-purple-800"
        : "border-slate-200 bg-white text-slate-600 hover:border-purple-300 hover:bg-purple-50",
      disabled && "cursor-not-allowed opacity-60",
    );

  const stepButtonClassName =
    "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-purple-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 disabled:cursor-not-allowed disabled:opacity-50";

  const selectedReaction = REACTIONS.find(
    ({ type }) => type === filter.reaction,
  );

  return (
    <>
      <button
        ref={buttonRef}
        aria-controls={isOpen ? panelId : undefined}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className={classNames(
          "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 disabled:cursor-not-allowed disabled:opacity-60",
          isFiltered
            ? "border-purple-300 bg-purple-50 text-purple-800"
            : "border-slate-200 bg-white text-slate-700 hover:border-purple-300",
        )}
        disabled={!onSortChange && !onFilterChange}
        onClick={() => setIsOpen((open) => !open)}
        type="button"
      >
        <SlidersHorizontal aria-hidden="true" className="h-4 w-4" />
        <span>Sort &amp; filter</span>
        <span
          className={classNames(
            "rounded-full px-2 py-0.5 text-xs",
            isFiltered
              ? "bg-purple-200 text-purple-900"
              : "bg-slate-100 text-slate-600",
          )}
        >
          {describeCommentView(sort, filter)}
        </span>
      </button>

      {isOpen && (
        <div
          ref={panelRef}
          aria-label="Sort and filter replies"
          className="absolute right-0 top-full z-20 mt-2 w-full max-w-xs space-y-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl"
          id={panelId}
          role="dialog"
        >
          <fieldset disabled={!onSortChange}>
            <legend className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              Sort by
            </legend>
            <div className="flex flex-wrap gap-2">
              {SORT_OPTIONS.map((option) => (
                <label key={option.value}>
                  <input
                    checked={sort === option.value}
                    className="peer sr-only"
                    name={`${panelId}-sort`}
                    onChange={() => onSortChange?.(option.value)}
                    type="radio"
                    value={option.value}
                  />
                  <span
                    className={optionClassName(
                      sort === option.value,
                      !onSortChange,
                    )}
                  >
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset disabled={!onFilterChange}>
            <legend className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              Reaction
            </legend>
            <div className="flex flex-wrap gap-2">
              {REACTION_FILTER_OPTIONS.map((option) => {
                const isSelected = filter.reaction === option.value;
                return (
                  <button
                    key={option.value}
                    aria-label={option.label}
                    aria-pressed={isSelected}
                    className={classNames(
                      optionClassName(isSelected, !onFilterChange),
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-1",
                    )}
                    // Pressing the selected reaction again clears it, so
                    // nobody has to find "All" to stop filtering by type.
                    onClick={() =>
                      onFilterChange?.({
                        ...filter,
                        reaction:
                          isSelected && option.value !== "all"
                            ? "all"
                            : option.value,
                      })
                    }
                    title={
                      isSelected && option.value !== "all"
                        ? `Clear ${option.label} filter`
                        : option.label
                    }
                    type="button"
                  >
                    {option.emoji ?? "All"}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset disabled={!onFilterChange}>
            <legend className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              At least
            </legend>
            <div className="flex items-center gap-2">
              <button
                aria-label="Decrease minimum reactions"
                className={stepButtonClassName}
                disabled={!onFilterChange || filter.minCount === 0}
                onClick={() => setMinCount(filter.minCount - 1)}
                type="button"
              >
                <Minus aria-hidden="true" className="h-4 w-4" />
              </button>
              <input
                aria-label="Minimum reactions"
                className="h-9 w-16 rounded-lg border border-slate-200 bg-white text-center text-sm font-semibold text-slate-700 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                inputMode="numeric"
                min={0}
                onBlur={() => setMinCountInput(String(filter.minCount))}
                onChange={(event) => {
                  setMinCountInput(event.target.value);
                  const minCount = parseMinReactions(event.target.value);
                  if (minCount !== null) setMinCount(minCount);
                }}
                step={1}
                type="number"
                value={minCountInput}
              />
              <button
                aria-label="Increase minimum reactions"
                className={stepButtonClassName}
                disabled={!onFilterChange}
                onClick={() => setMinCount(filter.minCount + 1)}
                type="button"
              >
                <Plus aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {selectedReaction
                ? `${selectedReaction.emoji} ${selectedReaction.label} reactions on a reply. Picking a reaction shows replies with at least one.`
                : "Total reactions of every type on a reply."}
            </p>
          </fieldset>

          <div className="flex items-center justify-between border-t border-slate-100 pt-3">
            <button
              className="text-sm font-semibold text-purple-700 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 disabled:cursor-not-allowed disabled:text-slate-400 disabled:no-underline"
              disabled={!onFilterChange || !isFiltered}
              onClick={() => onFilterChange?.(DEFAULT_COMMENT_FILTER)}
              type="button"
            >
              Reset filters
            </button>
            <button
              className="rounded-full bg-purple-600 px-4 py-1.5 text-sm font-bold text-white transition hover:bg-purple-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2"
              onClick={() => {
                setIsOpen(false);
                buttonRef.current?.focus();
              }}
              type="button"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
}
