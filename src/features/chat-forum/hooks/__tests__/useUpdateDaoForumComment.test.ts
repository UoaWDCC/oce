import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { updateForumComment } from "../../services";
import { useUpdateDaoForumComment } from "../useUpdateDaoForumComment";

vi.mock("../../services", () => ({
  updateForumComment: vi.fn(),
}));

const updateForumCommentMock = vi.mocked(updateForumComment);

beforeEach(() => {
  updateForumCommentMock.mockReset();
});

describe("useUpdateDaoForumComment", () => {
  it("updates the selected comment with the supplied token", async () => {
    updateForumCommentMock.mockResolvedValue({
      id: "comment-1",
      body: "Updated body",
      image_url: "existing.png",
      author_id: "user-1",
      username: "Jordan",
      like_count: 0,
      is_liked: false,
      parent_comment_id: null,
      created_at: "2026-08-19T00:00:00.000Z",
      updated_at: "2026-08-19T01:00:00.000Z",
      deleted_at: null,
    });
    const { result } = renderHook(() => useUpdateDaoForumComment("comment-1"));

    await act(async () => {
      await result.current.updateComment(
        { body: "Updated body", imageUrl: "existing.png" },
        "token-123",
      );
    });

    expect(updateForumCommentMock).toHaveBeenCalledWith(
      "comment-1",
      { body: "Updated body", image_url: "existing.png" },
      "token-123",
    );
    expect(result.current.error).toBeNull();
  });

  it("rejects failed updates so the editor can retain its contents", async () => {
    const failure = new Error("Update failed");
    updateForumCommentMock.mockRejectedValue(failure);
    const { result } = renderHook(() => useUpdateDaoForumComment("comment-1"));
    let caught: unknown;

    await act(async () => {
      try {
        await result.current.updateComment(
          { body: "Unsaved body" },
          "token-123",
        );
      } catch (error) {
        caught = error;
      }
    });

    expect(caught).toBe(failure);
    expect(result.current.error).toBe(failure);
  });

  it("rejects tokenless updates without sending a request", async () => {
    const { result } = renderHook(() => useUpdateDaoForumComment("comment-1"));
    let caught: unknown;

    await act(async () => {
      try {
        await result.current.updateComment({ body: "Updated body" });
      } catch (error) {
        caught = error;
      }
    });

    expect(caught).toEqual(new Error("Cannot update comment: not signed in"));
    expect(updateForumCommentMock).not.toHaveBeenCalled();
  });
});
