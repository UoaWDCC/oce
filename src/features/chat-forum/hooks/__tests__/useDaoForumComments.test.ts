import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useDaoForumComments } from "../useDaoForumComments";
import { getPostComments } from "../../services";
import { onlineManager, QueryClient } from "@tanstack/react-query";
import { createTestQueryClient, createWrapper } from "./queryTestUtils";
import type { FormattedComment } from "@app-types/dao-forum";

vi.mock("../../services", () => ({
  getPostComments: vi.fn(),
}));

const getPostCommentsMock = vi.mocked(getPostComments);

const loadedComment: FormattedComment = {
  id: "comment-1",
  body: "Already visible reply",
  image_url: null,
  author_id: "author-1",
  username: "Author",
  reaction_counts: { heart: 0, thumbs_up: 0, fire: 0, thumbs_down: 0 },
  user_reactions: {
    heart: false,
    thumbs_up: false,
    fire: false,
    thumbs_down: false,
  },
  wallet_address: null,
  ens_name: null,
  parent_comment_id: null,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: null,
  deleted_at: null,
};

beforeEach(() => {
  getPostCommentsMock.mockReset();
});

describe("useDaoForumComments", () => {
  it("does not fetch while disabled", () => {
    const client = createTestQueryClient();
    renderHook(
      () => useDaoForumComments("dao-1", "post-1", undefined, "oldest", false),
      { wrapper: createWrapper(client) },
    );

    expect(getPostCommentsMock).not.toHaveBeenCalled();
  });

  it("fetches exactly once with the token once enabled", async () => {
    getPostCommentsMock.mockResolvedValue([]);
    const client = createTestQueryClient();

    const { result } = renderHook(
      () => useDaoForumComments("dao-1", "post-1", "token-123", "oldest", true),
      { wrapper: createWrapper(client) },
    );

    await waitFor(() => expect(result.current.isInitialLoading).toBe(false));

    expect(getPostCommentsMock).toHaveBeenCalledTimes(1);
    expect(getPostCommentsMock).toHaveBeenCalledWith(
      "dao-1",
      "post-1",
      "oldest",
      "token-123",
      expect.any(AbortSignal),
    );
  });

  it("caches comments separately per sort order", async () => {
    getPostCommentsMock.mockResolvedValue([]);
    const client = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: Infinity, staleTime: Infinity },
      },
    });
    const wrapper = createWrapper(client);

    const { result, rerender } = renderHook(
      ({ sort }: { sort: "oldest" | "latest" }) =>
        useDaoForumComments("dao-1", "post-1", "token-123", sort, true),
      { wrapper, initialProps: { sort: "oldest" } },
    );
    await waitFor(() => expect(result.current.isInitialLoading).toBe(false));

    rerender({ sort: "latest" });
    await waitFor(() => expect(getPostCommentsMock).toHaveBeenCalledTimes(2));

    rerender({ sort: "oldest" });

    // Switching back to a previously-fetched sort should not trigger a
    // third request — it's already cached under its own key.
    expect(getPostCommentsMock).toHaveBeenCalledTimes(2);
  });

  it("keeps replies visible after a new sort fails and recovers on retry", async () => {
    let latestFails = true;
    getPostCommentsMock.mockImplementation(async (_dao, _post, sort) => {
      if (sort === "latest" && latestFails) throw new Error("Network failed");
      return [loadedComment];
    });
    const client = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: Infinity, staleTime: Infinity },
      },
    });
    const { result, rerender } = renderHook(
      ({ sort }: { sort: "oldest" | "latest" }) =>
        useDaoForumComments("dao-1", "post-1", "token-123", sort, true),
      {
        wrapper: createWrapper(client),
        initialProps: { sort: "oldest" },
      },
    );
    await waitFor(() => expect(result.current.comments).toHaveLength(1));

    rerender({ sort: "latest" });
    await waitFor(() =>
      expect(result.current.error?.message).toBe("Network failed"),
    );
    expect(result.current.comments[0].body).toBe("Already visible reply");
    expect(result.current.isBlockingError).toBe(false);
    expect(result.current.hasResolved).toBe(true);

    latestFails = false;
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.error).toBeNull());
    expect(result.current.comments[0].body).toBe("Already visible reply");
  });

  it("keeps replies and offers retry when a new sort is paused offline", async () => {
    getPostCommentsMock.mockResolvedValue([loadedComment]);
    const client = createTestQueryClient();
    const { result, rerender, unmount } = renderHook(
      ({ sort }: { sort: "oldest" | "latest" }) =>
        useDaoForumComments("dao-1", "post-1", "token-123", sort, true),
      {
        wrapper: createWrapper(client),
        initialProps: { sort: "oldest" },
      },
    );
    await waitFor(() => expect(result.current.comments).toHaveLength(1));

    try {
      act(() => {
        onlineManager.setOnline(false);
        rerender({ sort: "latest" });
      });
      await waitFor(() =>
        expect(result.current.error?.message).toMatch(/offline/i),
      );
      expect(result.current.comments[0].body).toBe("Already visible reply");
      expect(result.current.isBlockingError).toBe(false);
      expect(result.current.isRefreshing).toBe(false);
    } finally {
      unmount();
      onlineManager.setOnline(true);
    }
  });

  it("does not reuse another user's cached comments", async () => {
    const firstUserComment: FormattedComment = {
      id: "comment-a",
      body: "private to the first cached response",
      image_url: null,
      author_id: "user-a",
      username: "User A",
      reaction_counts: { heart: 0, thumbs_up: 0, fire: 0, thumbs_down: 0 },
      user_reactions: {
        heart: false,
        thumbs_up: false,
        fire: false,
        thumbs_down: false,
      },
      wallet_address: null,
      ens_name: null,
      parent_comment_id: null,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: null,
      deleted_at: null,
    };
    let resolveSecondUser: (comments: FormattedComment[]) => void = () => {};
    getPostCommentsMock
      .mockResolvedValueOnce([firstUserComment])
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSecondUser = resolve;
          }),
      );
    const client = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: Infinity, staleTime: Infinity },
      },
    });
    const wrapper = createWrapper(client);

    const { result, rerender } = renderHook(
      ({ token, userId }: { token: string; userId: string }) =>
        useDaoForumComments("dao-1", "post-1", token, "oldest", true, userId),
      {
        wrapper,
        initialProps: { token: "token-a", userId: "user-a" },
      },
    );
    await waitFor(() => expect(result.current.comments).toHaveLength(1));

    rerender({ token: "token-b", userId: "user-b" });

    expect(result.current.comments).toEqual([]);
    expect(result.current.isInitialLoading).toBe(true);
    await waitFor(() => expect(getPostCommentsMock).toHaveBeenCalledTimes(2));
    expect(getPostCommentsMock).toHaveBeenLastCalledWith(
      "dao-1",
      "post-1",
      "oldest",
      "token-b",
      expect.any(AbortSignal),
    );

    await act(async () => resolveSecondUser([]));
  });

  it("refetch refreshes every cached sort for the post, not just the active one", async () => {
    getPostCommentsMock.mockResolvedValue([]);
    const client = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: Infinity, staleTime: Infinity },
      },
    });
    const wrapper = createWrapper(client);

    const oldest = renderHook(
      () => useDaoForumComments("dao-1", "post-1", "token-123", "oldest", true),
      { wrapper },
    );
    await waitFor(() =>
      expect(oldest.result.current.isInitialLoading).toBe(false),
    );

    const latest = renderHook(
      () => useDaoForumComments("dao-1", "post-1", "token-123", "latest", true),
      { wrapper },
    );
    await waitFor(() =>
      expect(latest.result.current.isInitialLoading).toBe(false),
    );

    // "latest" is no longer observed by any mounted hook, but should still
    // be refreshed by refetch() below — not left stale until someone
    // switches back to it.
    latest.unmount();
    expect(getPostCommentsMock).toHaveBeenCalledTimes(2);

    await oldest.result.current.refetch();

    await waitFor(() => expect(getPostCommentsMock).toHaveBeenCalledTimes(4));
    const sortsRefetched = getPostCommentsMock.mock.calls
      .slice(2)
      .map((call) => call[2]);
    expect(sortsRefetched.sort()).toEqual(["latest", "oldest"]);
  });
});
