import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useDaoForumComments } from "../useDaoForumComments";
import { getPostComments } from "../../services";

vi.mock("../../services", () => ({
  getPostComments: vi.fn(),
}));

const getPostCommentsMock = vi.mocked(getPostComments);

beforeEach(() => {
  getPostCommentsMock.mockReset();
});

describe("useDaoForumComments", () => {
  it("does not fetch while disabled", () => {
    renderHook(() =>
      useDaoForumComments("dao-1", "post-1", undefined, "oldest", false),
    );

    expect(getPostCommentsMock).not.toHaveBeenCalled();
  });

  it("fetches exactly once with the token once enabled", async () => {
    getPostCommentsMock.mockResolvedValue([]);

    const { result } = renderHook(() =>
      useDaoForumComments("dao-1", "post-1", "token-123", "oldest", true),
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
});
