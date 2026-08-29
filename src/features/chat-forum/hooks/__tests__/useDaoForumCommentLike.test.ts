import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useDaoForumCommentLike } from "../useDaoForumCommentLike";
import { likeComment, unlikeComment } from "../../services";
import { forumKeys } from "../../queryKeys";
import { createTestQueryClient, createWrapper } from "./queryTestUtils";
import type { ForumCommentPreview } from "../../types";

vi.mock("../../services", () => ({
  likeComment: vi.fn(),
  unlikeComment: vi.fn(),
}));

const likeCommentMock = vi.mocked(likeComment);
const unlikeCommentMock = vi.mocked(unlikeComment);

function makeComment(
  overrides: Partial<ForumCommentPreview> = {},
): ForumCommentPreview {
  return {
    id: "comment-1",
    postId: "post-1",
    body: "hello",
    isLiked: false,
    likeCount: 0,
    ...overrides,
  } as ForumCommentPreview;
}

beforeEach(() => {
  likeCommentMock.mockReset().mockResolvedValue(true);
  unlikeCommentMock.mockReset().mockResolvedValue(true);
});

describe("useDaoForumCommentLike", () => {
  it("patches the comment in every cached sort, not just the visible one", async () => {
    const client = createTestQueryClient();
    const wrapper = createWrapper(client);

    client.setQueryData(
      forumKeys.comments("dao-1", "post-1", "oldest"),
      [makeComment()],
    );
    client.setQueryData(
      forumKeys.comments("dao-1", "post-1", "latest"),
      [makeComment()],
    );

    const { result } = renderHook(
      () => useDaoForumCommentLike("dao-1", "post-1"),
      { wrapper },
    );

    act(() => {
      result.current.toggleLike("comment-1", false, 0, "token-123");
    });

    const oldest = client.getQueryData<ForumCommentPreview[]>(
      forumKeys.comments("dao-1", "post-1", "oldest"),
    );
    const latest = client.getQueryData<ForumCommentPreview[]>(
      forumKeys.comments("dao-1", "post-1", "latest"),
    );

    expect(oldest?.[0]).toMatchObject({ isLiked: true, likeCount: 1 });
    expect(latest?.[0]).toMatchObject({ isLiked: true, likeCount: 1 });

    await waitFor(() => expect(likeCommentMock).toHaveBeenCalledTimes(1));
  });
});
