import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useDaoForumComments } from "../useDaoForumComments";
import { getPostComments } from "../../services";
import { QueryClient } from "@tanstack/react-query";
import { createTestQueryClient, createWrapper } from "./queryTestUtils";

vi.mock("../../services", () => ({
  getPostComments: vi.fn(),
}));

const getPostCommentsMock = vi.mocked(getPostComments);

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

    await waitFor(() => expect(result.current.isLoading).toBe(false));

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
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    rerender({ sort: "latest" });
    await waitFor(() => expect(getPostCommentsMock).toHaveBeenCalledTimes(2));

    rerender({ sort: "oldest" });

    // Switching back to a previously-fetched sort should not trigger a
    // third request — it's already cached under its own key.
    expect(getPostCommentsMock).toHaveBeenCalledTimes(2);
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
    await waitFor(() => expect(oldest.result.current.isLoading).toBe(false));

    const latest = renderHook(
      () => useDaoForumComments("dao-1", "post-1", "token-123", "latest", true),
      { wrapper },
    );
    await waitFor(() => expect(latest.result.current.isLoading).toBe(false));

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
