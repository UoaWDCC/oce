import { describe, expect, it, vi } from "vitest";
import { PENDING_ASYNC_STATE, toForumAsyncState } from "../asyncState";

type QueryShape = Parameters<typeof toForumAsyncState>[0];

/** The five query facts the projection reads, with idle defaults. */
function query(overrides: Partial<QueryShape> = {}): QueryShape {
  return {
    data: undefined,
    error: null,
    isError: false,
    isSuccess: false,
    isFetching: false,
    ...overrides,
  };
}

const noop = () => {};

describe("toForumAsyncState", () => {
  it("reports a first load while an enabled query has nothing yet", () => {
    const state = toForumAsyncState(query({ isFetching: true }), true, noop);

    expect(state.isInitialLoading).toBe(true);
    expect(state.isRefreshing).toBe(false);
    expect(state.hasResolved).toBe(false);
  });

  it("treats an enabled query that has not started as a first load", () => {
    // Queued behind a queryFn that has not been scheduled yet: the user is
    // waiting, so this must not read as "resolved and empty".
    expect(toForumAsyncState(query(), true, noop).isInitialLoading).toBe(true);
  });

  it("reports neither loading nor resolved while disabled", () => {
    const state = toForumAsyncState(query(), false, noop);

    expect(state.isInitialLoading).toBe(false);
    expect(state.hasResolved).toBe(false);
  });

  it("refreshes rather than reloads once data is present", () => {
    const state = toForumAsyncState(
      query({ data: [], isSuccess: true, isFetching: true }),
      true,
      noop,
    );

    expect(state.isInitialLoading).toBe(false);
    expect(state.isRefreshing).toBe(true);
    expect(state.hasResolved).toBe(true);
  });

  it("treats an empty array as data, not as absent data", () => {
    // `[]` is a legitimate successful result. Only `undefined` means "nothing
    // has ever loaded", which is why the check is against `undefined` and not
    // against length.
    const state = toForumAsyncState(
      query({ data: [], isSuccess: true }),
      true,
      noop,
    );

    expect(state.isInitialLoading).toBe(false);
    expect(state.hasResolved).toBe(true);
  });

  it("keeps a failed refresh non-blocking when data survives", () => {
    const state = toForumAsyncState(
      query({
        data: [{ id: "post-1" }],
        error: new Error("network down"),
        isError: true,
      }),
      true,
      noop,
    );

    expect(state.error?.message).toBe("network down");
    expect(state.isBlockingError).toBe(false);
    expect(state.isInitialLoading).toBe(false);
  });

  it("blocks only when a failure leaves nothing to show", () => {
    const state = toForumAsyncState(
      query({ error: new Error("boom"), isError: true }),
      true,
      noop,
    );

    expect(state.isBlockingError).toBe(true);
    expect(state.isInitialLoading).toBe(false);
    expect(state.hasResolved).toBe(true);
  });

  it("reports a retry after a blocking failure as refreshing", () => {
    const state = toForumAsyncState(
      query({ error: new Error("boom"), isError: true, isFetching: true }),
      true,
      noop,
    );

    expect(state.isRefreshing).toBe(true);
    expect(state.isInitialLoading).toBe(false);
  });

  it("passes the retry callback through", () => {
    const retry = vi.fn();
    toForumAsyncState(query(), true, retry).retry();

    expect(retry).toHaveBeenCalledTimes(1);
  });
});

describe("PENDING_ASYNC_STATE", () => {
  it("reads as a first load with nothing resolved", () => {
    expect(PENDING_ASYNC_STATE.isInitialLoading).toBe(true);
    expect(PENDING_ASYNC_STATE.hasResolved).toBe(false);
    expect(PENDING_ASYNC_STATE.isBlockingError).toBe(false);
    expect(PENDING_ASYNC_STATE.error).toBeNull();
  });
});
