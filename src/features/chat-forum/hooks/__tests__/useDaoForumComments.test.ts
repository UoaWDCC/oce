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
});
