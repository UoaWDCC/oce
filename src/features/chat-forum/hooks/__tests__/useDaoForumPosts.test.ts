import { StrictMode } from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useDaoForumPosts } from "../useDaoForumPosts";
import { getForumPosts } from "../../services";

vi.mock("../../services", () => ({
  getForumPosts: vi.fn(),
}));

const getForumPostsMock = vi.mocked(getForumPosts);

function rejectOnAbort(signal?: AbortSignal) {
  return new Promise<never>((_, reject) => {
    signal?.addEventListener("abort", () =>
      reject(new DOMException("Aborted", "AbortError")),
    );
  });
}

beforeEach(() => {
  getForumPostsMock.mockReset();
});

describe("useDaoForumPosts", () => {
  it("does not fetch while disabled", () => {
    renderHook(() => useDaoForumPosts("dao-1", undefined, false));

    expect(getForumPostsMock).not.toHaveBeenCalled();
  });

  it("fetches exactly once with the token once enabled", async () => {
    getForumPostsMock.mockResolvedValue([]);

    const { result } = renderHook(() =>
      useDaoForumPosts("dao-1", "token-123", true),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(getForumPostsMock).toHaveBeenCalledTimes(1);
    expect(getForumPostsMock).toHaveBeenCalledWith(
      "dao-1",
      "token-123",
      expect.any(AbortSignal),
    );
  });

  it("aborts the in-flight request when re-run before it resolves", async () => {
    getForumPostsMock.mockImplementation((_id, _token, signal) =>
      rejectOnAbort(signal),
    );

    const { rerender } = renderHook(
      ({ enabled }) => useDaoForumPosts("dao-1", "token-123", enabled),
      { initialProps: { enabled: true } },
    );

    const firstSignal = getForumPostsMock.mock.calls[0][2] as AbortSignal;
    expect(firstSignal.aborted).toBe(false);

    // Re-running the hook (Strict Mode's mount->cleanup->mount, or a dep change)
    // should cancel the first request rather than letting it race the next one.
    rerender({ enabled: false });

    expect(firstSignal.aborted).toBe(true);
  });

  it("resolves a single request under Strict Mode double-mount", async () => {
    // Strict Mode mounts the effect, cleans it up, then mounts again. The
    // cleanup aborts the first request, so only the second one resolves.
    let resolvedCount = 0;
    getForumPostsMock.mockImplementation((_id, _token, signal) => {
      if (signal?.aborted) return rejectOnAbort(signal);
      return new Promise((resolve, reject) => {
        signal?.addEventListener("abort", () =>
          reject(new DOMException("Aborted", "AbortError")),
        );
        queueMicrotask(() => {
          if (signal?.aborted) return;
          resolvedCount += 1;
          resolve([]);
        });
      });
    });

    const { result } = renderHook(
      () => useDaoForumPosts("dao-1", "token-123", true),
      { wrapper: StrictMode },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(resolvedCount).toBe(1);
    const firstSignal = getForumPostsMock.mock.calls[0][2] as AbortSignal;
    expect(firstSignal.aborted).toBe(true);
  });

  it("surfaces a fetch error", async () => {
    getForumPostsMock.mockRejectedValue(new Error("boom"));

    const { result } = renderHook(() =>
      useDaoForumPosts("dao-1", "token-123", true),
    );

    await waitFor(() => expect(result.current.error?.message).toBe("boom"));
  });
});
