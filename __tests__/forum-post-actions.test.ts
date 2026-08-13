import { describe, expect, it, vi } from "vitest";
import { POST_TYPE, type Post } from "@app-types/dao-forum";
import {
  submitForumPostDelete,
  submitForumPostUpdate,
} from "@/features/chat-forum/submitHandlers";

const payload = {
  title: "Updated",
  body: "Updated body",
  postType: POST_TYPE.Discussion,
  anonymous: false,
  isPinned: false,
  imageUrl: "https://example.supabase.co/forum-images/user/image.png",
};

const updatedPost: Post = {
  id: "post-1",
  dao_group_id: "dao-1",
  author_id: "user-1",
  post_type: POST_TYPE.Discussion,
  title: "Updated",
  body: "Updated body",
  anonymous: false,
  is_pinned: false,
  image_url: payload.imageUrl,
  created_at: "2026-07-22T00:00:00.000Z",
  updated_at: "2026-08-13T00:00:00.000Z",
  deleted_at: null,
};

describe("submitForumPostUpdate", () => {
  it("updates the cache and refetches after a successful edit", async () => {
    const updatePost = vi.fn().mockResolvedValue(updatedPost);
    const applyUpdatedPost = vi.fn();
    const refetchPosts = vi.fn();

    await submitForumPostUpdate(
      { updatePost, applyUpdatedPost, refetchPosts },
      payload,
    );

    expect(applyUpdatedPost).toHaveBeenCalledWith(updatedPost);
    expect(refetchPosts).toHaveBeenCalledOnce();
  });

  it("does not update the cache when the edit fails", async () => {
    const updatePost = vi.fn().mockRejectedValue(new Error("Update failed"));
    const applyUpdatedPost = vi.fn();
    const refetchPosts = vi.fn();

    await expect(
      submitForumPostUpdate(
        { updatePost, applyUpdatedPost, refetchPosts },
        payload,
      ),
    ).rejects.toThrow("Update failed");

    expect(applyUpdatedPost).not.toHaveBeenCalled();
    expect(refetchPosts).not.toHaveBeenCalled();
  });
});

describe("submitForumPostDelete", () => {
  it("removes the post from the cache and refetches after a successful delete", async () => {
    const deletePost = vi.fn().mockResolvedValue(true);
    const removePost = vi.fn();
    const refetchPosts = vi.fn();

    await expect(
      submitForumPostDelete({ deletePost, removePost, refetchPosts }),
    ).resolves.toBe(true);

    expect(removePost).toHaveBeenCalledOnce();
    expect(refetchPosts).toHaveBeenCalledOnce();
  });

  it("does not mutate the cache when delete fails", async () => {
    const deletePost = vi.fn().mockResolvedValue(false);
    const removePost = vi.fn();
    const refetchPosts = vi.fn();

    await expect(
      submitForumPostDelete({ deletePost, removePost, refetchPosts }),
    ).resolves.toBe(false);

    expect(removePost).not.toHaveBeenCalled();
    expect(refetchPosts).not.toHaveBeenCalled();
  });
});
