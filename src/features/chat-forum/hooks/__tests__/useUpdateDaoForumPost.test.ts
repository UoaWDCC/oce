import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useUpdateDaoForumPost } from "../useUpdateDaoForumPost";
import { updateForumPost } from "../../services";
import { mapPostSubmitPayloadToUpdatePostFields } from "../../mappers";
import type {
  Post,
  PostSubmitPayload,
  UpdatePostFields,
} from "@app-types/dao-forum";

vi.mock("../../services", () => ({
  updateForumPost: vi.fn(),
}));

vi.mock("../../mappers", () => ({
  mapPostSubmitPayloadToUpdatePostFields: vi.fn(),
}));

const updateForumPostMock = vi.mocked(updateForumPost);
const mapFieldsMock = vi.mocked(mapPostSubmitPayloadToUpdatePostFields);

const payload = {} as PostSubmitPayload;
const updatedPost = {} as Post;
const updateFields = {} as UpdatePostFields;

beforeEach(() => {
  updateForumPostMock.mockReset();
  updateForumPostMock.mockResolvedValue(updatedPost);
  mapFieldsMock.mockReset();
  mapFieldsMock.mockReturnValue(updateFields);
});

describe("useUpdateDaoForumPost", () => {
  it("does not call the service when the token is missing", async () => {
    const { result } = renderHook(() =>
      useUpdateDaoForumPost("dao-1", "post-1", undefined),
    );

    await act(async () => {
      await result.current.updatePost(payload);
    });

    expect(updateForumPostMock).not.toHaveBeenCalled();
    expect(result.current.error?.message).toBe(
      "Cannot update post: not signed in",
    );
  });

  it("uses the current token after a refresh rather than a stale one", async () => {
    const { result, rerender } = renderHook(
      ({ token }) => useUpdateDaoForumPost("dao-1", "post-1", token),
      { initialProps: { token: "old-token" } },
    );

    // Session refreshes to a new access token before the mutation fires.
    rerender({ token: "new-token" });

    await act(async () => {
      await result.current.updatePost(payload);
    });

    expect(updateForumPostMock).toHaveBeenCalledTimes(1);
    expect(updateForumPostMock).toHaveBeenCalledWith(
      "dao-1",
      "post-1",
      updateFields,
      "new-token",
    );
  });
});
