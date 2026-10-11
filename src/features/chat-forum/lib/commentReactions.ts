import type { ReactionCounts, ReactionType } from "@app-types/dao-forum";
import type {
  ForumCommentFilter,
  ForumReactionFilterType,
  ForumThreadSort,
} from "../types";

export const REACTION_TYPES: readonly ReactionType[] = [
  "heart",
  "thumbs_up",
  "fire",
  "thumbs_down",
];

export const COMMENT_SORTS: readonly ForumThreadSort[] = [
  "oldest",
  "latest",
  "most_reacted",
];

export const REACTION_FILTER_TYPES: readonly ForumReactionFilterType[] = [
  "all",
  ...REACTION_TYPES,
];

export const DEFAULT_COMMENT_SORT: ForumThreadSort = "oldest";

export const DEFAULT_COMMENT_FILTER: ForumCommentFilter = {
  reaction: "all",
  minCount: 0,
};

/** The fields sorting and filtering read from an API comment. */
type ReactableComment = {
  id: string;
  parent_comment_id: string | null;
  created_at: string;
  deleted_at: string | null;
  reaction_counts?: ReactionCounts;
};

export function totalReactions(counts: ReactionCounts | undefined): number {
  if (!counts) return 0;
  return REACTION_TYPES.reduce((total, type) => total + (counts[type] ?? 0), 0);
}

export function reactionCountFor(
  counts: ReactionCounts | undefined,
  reaction: ForumReactionFilterType,
): number {
  if (reaction === "all") return totalReactions(counts);
  return counts?.[reaction] ?? 0;
}

export function isCommentFilterActive(filter: ForumCommentFilter): boolean {
  return filter.reaction !== "all" || filter.minCount > 0;
}

/**
 * A specific reaction type always needs at least one of that reaction, so
 * filtering by Fire never shows comments without Fire even at a minimum of 0.
 */
export function matchesCommentFilter(
  counts: ReactionCounts | undefined,
  filter: ForumCommentFilter,
): boolean {
  const minimum =
    filter.reaction === "all" ? filter.minCount : Math.max(filter.minCount, 1);
  return reactionCountFor(counts, filter.reaction) >= minimum;
}

function createdAtMs(comment: ReactableComment) {
  return new Date(comment.created_at).getTime();
}

function compareIds(a: ReactableComment, b: ReactableComment) {
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * Orders comments for one sort. Every sort ends on the comment id so equal
 * timestamps and equal reaction totals still come back in the same order.
 */
export function compareComments(
  sort: ForumThreadSort,
): (a: ReactableComment, b: ReactableComment) => number {
  const newestFirst = (a: ReactableComment, b: ReactableComment) =>
    createdAtMs(b) - createdAtMs(a) || compareIds(b, a);

  if (sort === "latest") return newestFirst;
  if (sort === "most_reacted") {
    return (a, b) =>
      totalReactions(b.reaction_counts) - totalReactions(a.reaction_counts) ||
      newestFirst(a, b);
  }
  return (a, b) => createdAtMs(a) - createdAtMs(b) || compareIds(a, b);
}

/**
 * Keeps every live comment that matches the filter, plus each ancestor a
 * kept comment needs to stay nested. Ancestors that do not match themselves
 * are flagged as context so the thread can show them differently, and a
 * reply is never left without its parent and promoted to the top level.
 * Deleted comments never match; they survive only as ancestors.
 */
export function filterCommentsWithAncestors<T extends ReactableComment>(
  comments: T[],
  filter: ForumCommentFilter,
): Array<T & { is_context_only: boolean }> {
  const byId = new Map(comments.map((comment) => [comment.id, comment]));
  const matched = new Set<string>();
  const kept = new Set<string>();

  comments.forEach((comment) => {
    if (comment.deleted_at) return;
    if (!matchesCommentFilter(comment.reaction_counts, filter)) return;
    matched.add(comment.id);

    let current: T | undefined = comment;
    while (current && !kept.has(current.id)) {
      kept.add(current.id);
      current = current.parent_comment_id
        ? byId.get(current.parent_comment_id)
        : undefined;
    }
  });

  return comments
    .filter((comment) => kept.has(comment.id))
    .map((comment) => ({
      ...comment,
      is_context_only: !matched.has(comment.id) && !comment.deleted_at,
    }));
}

/** Returns the sort, or null when the value is not a supported sort. */
export function parseCommentSort(
  value: string | null | undefined,
): ForumThreadSort | null {
  if (value === null || value === undefined) return DEFAULT_COMMENT_SORT;
  return (COMMENT_SORTS as readonly string[]).includes(value)
    ? (value as ForumThreadSort)
    : null;
}

/** Returns the reaction filter type, or null when it is not supported. */
export function parseReactionFilterType(
  value: string | null | undefined,
): ForumReactionFilterType | null {
  if (value === null || value === undefined)
    return DEFAULT_COMMENT_FILTER.reaction;
  return (REACTION_FILTER_TYPES as readonly string[]).includes(value)
    ? (value as ForumReactionFilterType)
    : null;
}

/** Returns the minimum count, or null unless it is a non-negative whole number. */
export function parseMinReactions(
  value: string | null | undefined,
): number | null {
  if (value === null || value === undefined)
    return DEFAULT_COMMENT_FILTER.minCount;
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}
