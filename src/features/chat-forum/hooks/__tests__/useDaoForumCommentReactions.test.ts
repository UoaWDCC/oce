import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useDaoForumCommentReactions } from "../useDaoForumCommentReactions";
import { addCommentReaction, removeCommentReaction } from "../../services";
import { forumKeys } from "../../queryKeys";
import { createTestQueryClient, createWrapper } from "./queryTestUtils";
import type { ForumCommentPreview } from "../../types";

vi.mock("../../services", () => ({
  addCommentReaction: vi.fn(),
  removeCommentReaction: vi.fn(),
}));

const addReactionMock = vi.mocked(addCommentReaction);
const removeReactionMock = vi.mocked(removeCommentReaction);
const commentKey = forumKeys.comments("dao-1", "post-1", "latest", "user-1");

function makeComment(heartCount: number): ForumCommentPreview {
  return {
    id: "comment-1",
    postId: "post-1",
    reactionCounts: {
      heart: heartCount,
      thumbs_up: 0,
      fire: 0,
      thumbs_down: 0,
    },
    userReactions: {
      heart: false,
      thumbs_up: false,
      fire: false,
      thumbs_down: false,
    },
  } as ForumCommentPreview;
}

beforeEach(() => {
  addReactionMock.mockReset();
  removeReactionMock.mockReset();
});

describe("useDaoForumCommentReactions", () => {
  it("removes a failed optimistic override after refreshing server counts", async () => {
    const client = createTestQueryClient();
    let serverHeartCount = 0;
    const queryFn = vi.fn(async () => [makeComment(serverHeartCount)]);
    await client.prefetchQuery({ queryKey: commentKey, queryFn });
    addReactionMock.mockRejectedValue(new Error("Reaction request failed"));

    const { result } = renderHook(
      () => useDaoForumCommentReactions("dao-1", "post-1", "user-1"),
      { wrapper: createWrapper(client) },
    );

    act(() => result.current.toggleReaction("comment-1", "heart", "token"));
    expect(
      result.current.optimisticState["comment-1"]?.reactionCounts.heart,
    ).toBe(1);

    serverHeartCount = 2;
    await waitFor(() => expect(queryFn).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.current.optimisticState).toEqual({}));
    expect(result.current.error?.message).toBe("Reaction request failed");
    expect(
      client.getQueryData<ForumCommentPreview[]>(commentKey)?.[0].reactionCounts
        ?.heart,
    ).toBe(2);
  });

  it("clears the final override after rapid clicks fail", async () => {
    const client = createTestQueryClient();
    const queryFn = vi.fn(async () => [makeComment(0)]);
    await client.prefetchQuery({ queryKey: commentKey, queryFn });
    addReactionMock.mockRejectedValue(new Error("Add failed"));
    removeReactionMock.mockRejectedValue(new Error("Remove failed"));

    const { result } = renderHook(
      () => useDaoForumCommentReactions("dao-1", "post-1", "user-1"),
      { wrapper: createWrapper(client) },
    );

    act(() => {
      result.current.toggleReaction("comment-1", "heart", "token");
      result.current.toggleReaction("comment-1", "heart", "token");
    });

    await waitFor(() => expect(queryFn).toHaveBeenCalledTimes(3));
    await waitFor(() => expect(result.current.optimisticState).toEqual({}));
    expect(addReactionMock).toHaveBeenCalledTimes(1);
    expect(removeReactionMock).toHaveBeenCalledTimes(1);
  });
});
