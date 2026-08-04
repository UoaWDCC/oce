import { describe, it, expect, vi } from "vitest";
import {
  submitForumComment,
  submitForumPost,
} from "@/features/chat-forum/submitHandlers";
import type { PostSubmitPayload } from "@app-types/dao-forum";

const samplePostPayload: PostSubmitPayload = {
  title: "New proposal",
  body: "Body text",
  postType: "Discussion",
  anonymous: false,
  isPinned: false,
};

describe("submitForumPost", () => {
  it("creates the post then refetches the list on success", async () => {
    const createdPost = { id: "post-1" };
    const createPost = vi.fn().mockResolvedValue(createdPost);
    const refetchPosts = vi.fn();

    const result = await submitForumPost(
      { createPost, refetchPosts },
      samplePostPayload,
    );

    expect(createPost).toHaveBeenCalledWith(samplePostPayload);
    expect(refetchPosts).toHaveBeenCalledTimes(1);
    expect(result).toBe(createdPost);
  });

  it("does not refetch when the create fails (hook returns null)", async () => {
    const createPost = vi.fn().mockResolvedValue(null);
    const refetchPosts = vi.fn();

    const result = await submitForumPost(
      { createPost, refetchPosts },
      samplePostPayload,
    );

    expect(createPost).toHaveBeenCalledTimes(1);
    expect(refetchPosts).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });
});

describe("submitForumComment", () => {
  it("maps the payload, creates the comment, then refetches on success", async () => {
    const createdComment = { id: "comment-1" };
    const createComment = vi.fn().mockResolvedValue(createdComment);
    const refetchComments = vi.fn();

    const result = await submitForumComment(
      { createComment, refetchComments },
      { body: "Nice", imageUrl: "img.png", parentCommentId: "comment-0" },
    );

    expect(createComment).toHaveBeenCalledWith({
      body: "Nice",
      imageUrl: "img.png",
      parentCommentId: "comment-0",
    });
    expect(refetchComments).toHaveBeenCalledTimes(1);
    expect(result).toBe(createdComment);
  });

  it("does not refetch when the create fails (hook returns undefined)", async () => {
    const createComment = vi.fn().mockResolvedValue(undefined);
    const refetchComments = vi.fn();

    const result = await submitForumComment(
      { createComment, refetchComments },
      { body: "Nice" },
    );

    expect(createComment).toHaveBeenCalledTimes(1);
    expect(refetchComments).not.toHaveBeenCalled();
    expect(result).toBeUndefined();
  });
});
