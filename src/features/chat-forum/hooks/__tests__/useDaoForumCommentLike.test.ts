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
      forumKeys.comments("dao-1", "post-1", "oldest", "user-1"),
      [makeComment()],
    );
    client.setQueryData(
      forumKeys.comments("dao-1", "post-1", "latest", "user-1"),
      [makeComment()],
    );
    client.setQueryData(
      forumKeys.comments("dao-1", "post-1", "oldest", "user-2"),
      [makeComment()],
    );

    const { result } = renderHook(
      () => useDaoForumCommentLike("dao-1", "post-1", "user-1"),
      { wrapper },
    );

    act(() => {
      result.current.toggleLike("comment-1", false, 0, "token-123");
    });

    const oldest = client.getQueryData<ForumCommentPreview[]>(
      forumKeys.comments("dao-1", "post-1", "oldest", "user-1"),
    );
    const latest = client.getQueryData<ForumCommentPreview[]>(
      forumKeys.comments("dao-1", "post-1", "latest", "user-1"),
    );
    const otherUser = client.getQueryData<ForumCommentPreview[]>(
      forumKeys.comments("dao-1", "post-1", "oldest", "user-2"),
    );

    expect(oldest?.[0]).toMatchObject({ isLiked: true, likeCount: 1 });
    expect(latest?.[0]).toMatchObject({ isLiked: true, likeCount: 1 });
    expect(otherUser?.[0]).toMatchObject({ isLiked: false, likeCount: 0 });

    await waitFor(() => expect(likeCommentMock).toHaveBeenCalledTimes(1));
  });
});
