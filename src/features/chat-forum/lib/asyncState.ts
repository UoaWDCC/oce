import type { UseQueryResult } from "@tanstack/react-query";

/**
 * The forum's shared vocabulary for "how is this query doing right now".
 *
 * Query hooks used to collapse `isPending`, `isFetching`, data presence and
 * `error` into a single `isLoading` boolean. Those are four independent facts,
 * and flattening them made it impossible for components to tell a first load
 * apart from a background refresh, or a failed fetch apart from a failed fetch
 * that still has usable data behind it. Every forum query now reports this
 * shape instead, and components branch on it consistently:
 *
 * - `isInitialLoading` is the only condition that may render a skeleton.
 * - `hasResolved` is the only gate for a count or an empty state.
 * - `error` renders a banner *above* retained content, never in place of it.
 * - `isBlockingError` is the only condition that may replace the content area.
 */
export interface ForumAsyncState {
  /** No data has ever loaded for this key, and a fetch is expected or running. */
  isInitialLoading: boolean;
  /** A fetch is in flight while something is already on screen to keep. */
  isRefreshing: boolean;
  /** The query has settled at least once, so counts and empty states are truthful. */
  hasResolved: boolean;
  /** The last fetch failed. Data may still be present and must stay rendered. */
  error: Error | null;
  /** The last fetch failed with nothing to fall back on. */
  isBlockingError: boolean;
  /** Re-runs the fetch. Wired to whatever "refresh" means for that query. */
  retry: () => void;
}

function noop() {}

/**
 * The state to report while a prerequisite of the query — an auth session, a
 * selected post — is still resolving. The query itself is disabled and knows
 * nothing yet, but the user is genuinely waiting, so this reads as a first load.
 */
export const PENDING_ASYNC_STATE: ForumAsyncState = {
  isInitialLoading: true,
  isRefreshing: false,
  hasResolved: false,
  error: null,
  isBlockingError: false,
  retry: noop,
};

/**
 * The state to assume for a component rendered with data but no state of its
 * own — the dev preview harness and tests, which pass static posts and
 * comments and never fetch anything.
 *
 * This is the right *default* precisely because `PENDING_ASYNC_STATE` is not:
 * defaulting to a first load leaves such a caller staring at a skeleton that
 * can never resolve, since nothing will ever hand it a settled state. Callers
 * that do fetch always pass their own state, so this default never masks a
 * real load.
 */
export const RESOLVED_ASYNC_STATE: ForumAsyncState = {
  isInitialLoading: false,
  isRefreshing: false,
  hasResolved: true,
  error: null,
  isBlockingError: false,
  retry: noop,
};

/**
 * Projects a React Query result onto {@link ForumAsyncState}.
 *
 * `enabled` has to be passed in because a disabled query is indistinguishable
 * from a queued one by its own status alone: both sit at `pending`/`idle`. A
 * disabled query reports neither loading nor resolved, so callers render
 * neither a skeleton nor a misleading "nothing here yet".
 *
 * Note that `isBlockingError` keys off data presence rather than `status`.
 * React Query retains `data` when a refetch fails, but whether `status` also
 * flips to `error` in that case is an implementation detail we would rather not
 * depend on across upgrades — "did the last fetch fail" and "do we have
 * anything to show" are separate questions, so they are asked separately.
 */
export function toForumAsyncState<TData>(
  query: Pick<
    UseQueryResult<TData>,
    "data" | "error" | "isError" | "isSuccess" | "isFetching"
  >,
  enabled: boolean,
  retry: () => void,
): ForumAsyncState {
  const hasData = query.data !== undefined;
  const isInitialLoading =
    !hasData && !query.isError && (enabled || query.isFetching);

  return {
    isInitialLoading,
    isRefreshing: query.isFetching && !isInitialLoading,
    hasResolved: query.isSuccess || query.isError,
    error: (query.error as Error | null) ?? null,
    isBlockingError: query.isError && !hasData,
    retry,
  };
}
