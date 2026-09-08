import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useDaoForumPosts } from "../useDaoForumPosts";
import { getForumPosts } from "../../services";
import { QueryClient } from "@tanstack/react-query";
import { createTestQueryClient, createWrapper } from "./queryTestUtils";

vi.mock("../../services", () => ({
  getForumPosts: vi.fn(),
}));

const getForumPostsMock = vi.mocked(getForumPosts);

beforeEach(() => {
  getForumPostsMock.mockReset();
});

describe("useDaoForumPosts", () => {
  it("does not fetch while disabled", () => {
    const client = createTestQueryClient();
    renderHook(() => useDaoForumPosts("dao-1", undefined, false), {
      wrapper: createWrapper(client),
    });

    expect(getForumPostsMock).not.toHaveBeenCalled();
  });

  it("fetches exactly once with the token once enabled", async () => {
    getForumPostsMock.mockResolvedValue([]);
    const client = createTestQueryClient();

    const { result } = renderHook(
      () => useDaoForumPosts("dao-1", "token-123", true),
      { wrapper: createWrapper(client) },
    );

    await waitFor(() => expect(result.current.isInitialLoading).toBe(false));

    expect(getForumPostsMock).toHaveBeenCalledTimes(1);
    expect(getForumPostsMock).toHaveBeenCalledWith(
      "dao-1",
      "token-123",
      expect.any(AbortSignal),
    );
  });

  it("surfaces a fetch error", async () => {
    getForumPostsMock.mockRejectedValue(new Error("boom"));
    const client = createTestQueryClient();

    const { result } = renderHook(
      () => useDaoForumPosts("dao-1", "token-123", true),
      { wrapper: createWrapper(client) },
    );

    await waitFor(() => expect(result.current.error?.message).toBe("boom"));
  });

  it("deduplicates identical in-flight requests across hook instances", async () => {
    let resolvePosts: (value: never[]) => void = () => {};
    getForumPostsMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePosts = resolve;
        }),
    );
    const client = createTestQueryClient();
    const wrapper = createWrapper(client);

    renderHook(() => useDaoForumPosts("dao-1", "token-123", true), {
      wrapper,
    });
    renderHook(() => useDaoForumPosts("dao-1", "token-123", true), {
      wrapper,
    });

    resolvePosts([]);
    await waitFor(() => expect(getForumPostsMock).toHaveBeenCalledTimes(1));
  });

  it("shows cached posts immediately when remounted without a full reload", async () => {
    getForumPostsMock.mockResolvedValue([]);
    const client = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: Infinity, staleTime: Infinity },
      },
    });
    const wrapper = createWrapper(client);

    const { result, unmount } = renderHook(
      () => useDaoForumPosts("dao-1", "token-123", true),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isInitialLoading).toBe(false));
    unmount();

    const { result: secondResult } = renderHook(
      () => useDaoForumPosts("dao-1", "token-123", true),
      { wrapper },
    );

    // Cached data is available immediately; no loading state on remount.
    expect(secondResult.current.isInitialLoading).toBe(false);
    expect(getForumPostsMock).toHaveBeenCalledTimes(1);
  });

  it("does not reuse another user's cached posts", async () => {
    getForumPostsMock.mockResolvedValue([]);
    const client = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: Infinity, staleTime: Infinity },
      },
    });
    const wrapper = createWrapper(client);

    const firstUser = renderHook(
      () => useDaoForumPosts("dao-1", "token-a", true, "user-a"),
      { wrapper },
    );
    await waitFor(() => expect(firstUser.result.current.isInitialLoading).toBe(false));
    firstUser.unmount();

    const secondUser = renderHook(
      () => useDaoForumPosts("dao-1", "token-b", true, "user-b"),
      { wrapper },
    );

    expect(secondUser.result.current.isInitialLoading).toBe(true);
    await waitFor(() => expect(getForumPostsMock).toHaveBeenCalledTimes(2));
    expect(getForumPostsMock).toHaveBeenLastCalledWith(
      "dao-1",
      "token-b",
      expect.any(AbortSignal),
    );
  });
});
