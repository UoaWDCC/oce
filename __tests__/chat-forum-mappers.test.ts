import { describe, expect, it } from "vitest";
import {
  POST_TYPE,
  type ForumCommentPreview,
  type Post,
} from "@app-types/dao-forum";
import {
  applyUpdatedPostToPreview,
  buildForumThreadComments,
  getIsOwnPost,
  mapCommentToForumCommentPreview,
  mapForumPostPreviewToThreadPost,
  mapPostSubmitPayloadToCreatePostFields,
  mapPostSubmitPayloadToUpdatePostFields,
  mapPostToForumPostPreview,
  withOwnPostCapability,
} from "@/features/chat-forum/mappers";

describe("mapPostSubmitPayloadToCreatePostFields", () => {
  it("maps the composer payload to the create-post API payload", () => {
    expect(
      mapPostSubmitPayloadToCreatePostFields({
        title: "Question title",
        body: "Question body",
        postType: POST_TYPE.Question,
        anonymous: true,
        isPinned: false,
        imageUrl: undefined,
      }),
    ).toEqual({
      post_type: "Question",
      title: "Question title",
      body: "Question body",
      anonymous: true,
      is_pinned: false,
      image_url: null,
    });
  });

  it("preserves an uploaded image URL", () => {
    expect(
      mapPostSubmitPayloadToCreatePostFields({
        title: "Image post",
        body: "Post body",
        postType: POST_TYPE.Discussion,
        anonymous: false,
        isPinned: false,
        imageUrl: "https://example.supabase.co/forum-images/user/image.png",
      }).image_url,
    ).toBe("https://example.supabase.co/forum-images/user/image.png");
  });
});

describe("mapCommentToForumCommentPreview", () => {
  it("preserves reply relationships and marks deleted comments", () => {
    expect(
      mapCommentToForumCommentPreview(
        {
          id: "comment-2",
          body: null,
          image_url: null,
          author_id: "user-1",
          username: "Jordan",
          like_count: 3,
          is_liked: true,
          parent_comment_id: "comment-1",
          created_at: "2026-07-22T00:00:00.000Z",
          updated_at: null,
        },
        "post-1",
      ),
    ).toMatchObject({
      id: "comment-2",
      postId: "post-1",
      parentCommentId: "comment-1",
      isDeleted: true,
      isLiked: true,
    });
  });

  it("preserves a comment attachment URL", () => {
    const comment = mapCommentToForumCommentPreview(
      {
        id: "comment-image",
        body: "Attached image",
        image_url: "https://example.supabase.co/forum-images/user/image.png",
        author_id: "user-1",
        username: "Jordan",
        like_count: 0,
        is_liked: false,
        parent_comment_id: null,
        created_at: "2026-07-22T00:00:00.000Z",
        updated_at: null,
      },
      "post-1",
    );

    expect(comment.imageUrl).toBe(
      "https://example.supabase.co/forum-images/user/image.png",
    );
  });
});

describe("buildForumThreadComments", () => {
  it("builds nested replies while preserving API order", () => {
    const comments: ForumCommentPreview[] = [
      {
        id: "parent",
        postId: "post-1",
        parentCommentId: null,
        authorName: "Alex",
        body: "Parent",
        createdAt: "2026-07-22T00:00:00.000Z",
        createdAtLabel: "Jul 22, 2026",
        likeCount: 1,
      },
      {
        id: "child",
        postId: "post-1",
        parentCommentId: "parent",
        authorName: "Sam",
        body: "Child",
        createdAt: "2026-07-22T01:00:00.000Z",
        createdAtLabel: "Jul 22, 2026",
        likeCount: 0,
      },
    ];

    const thread = buildForumThreadComments(comments);

    expect(thread).toHaveLength(1);
    expect(thread[0].id).toBe("parent");
    expect(thread[0].replies?.map((reply) => reply.id)).toEqual(["child"]);
  });

  it("hides attachments from deleted comments", () => {
    const comments: ForumCommentPreview[] = [
      {
        id: "deleted",
        postId: "post-1",
        parentCommentId: null,
        authorName: "Alex",
        body: "",
        imageUrl: "https://example.supabase.co/forum-images/user/image.png",
        createdAt: "2026-07-22T00:00:00.000Z",
        createdAtLabel: "Jul 22, 2026",
        likeCount: 0,
        isDeleted: true,
      },
    ];

    expect(buildForumThreadComments(comments)[0].imageUrl).toBeNull();
  });
});

describe("mapPostSubmitPayloadToUpdatePostFields", () => {
  it("keeps an existing image URL when it is included in the payload", () => {
    expect(
      mapPostSubmitPayloadToUpdatePostFields({
        title: "Updated title",
        body: "Updated body",
        postType: POST_TYPE.Discussion,
        anonymous: false,
        isPinned: true,
        imageUrl: "https://example.supabase.co/forum-images/user/image.png",
      }).image_url,
    ).toBe("https://example.supabase.co/forum-images/user/image.png");
  });

  it("clears the image when the payload explicitly sends null", () => {
    expect(
      mapPostSubmitPayloadToUpdatePostFields({
        title: "Updated title",
        body: "Updated body",
        postType: POST_TYPE.Discussion,
        anonymous: false,
        isPinned: false,
        imageUrl: null,
      }).image_url,
    ).toBeNull();
  });
});

describe("getIsOwnPost", () => {
  it("marks a post as owned when the author matches the current user", () => {
    expect(getIsOwnPost({ authorId: "user-1" }, "user-1")).toBe(true);
  });

  it("does not mark a post as owned for a different user", () => {
    expect(getIsOwnPost({ authorId: "user-1" }, "user-2")).toBe(false);
  });

  it("falls back to an explicit isOwnPost flag when authorId is missing", () => {
    expect(getIsOwnPost({ isOwnPost: true }, "user-1")).toBe(true);
    expect(getIsOwnPost({ isOwnPost: false }, "user-1")).toBe(false);
  });
});

describe("mapPostToForumPostPreview", () => {
  const listItem = {
    id: "post-1",
    dao_group_id: "dao-1",
    author_id: "user-1",
    post_type: POST_TYPE.Question,
    title: "Title",
    body: "Body",
    anonymous: false,
    is_pinned: false,
    image_url: "https://example.supabase.co/forum-images/user/image.png",
    created_at: "2026-07-22T00:00:00.000Z",
    updated_at: null,
    comment_count: 2,
    view_count: 4,
    is_unread: true,
    author: {
      id: "user-1",
      username: "jordan",
      FirstName: "Jordan",
      LastName: "S",
      Name: "Jordan S.",
    },
    tags: ["Governance"],
  };

  it("includes authorId and isOwnPost on the frontend model", () => {
    const preview = mapPostToForumPostPreview(listItem, "user-1");

    expect(preview.authorId).toBe("user-1");
    expect(preview.isOwnPost).toBe(true);
    expect(preview.isUnread).toBe(true);
    expect(preview.anonymous).toBe(false);
    expect(preview.imageUrl).toBe(
      "https://example.supabase.co/forum-images/user/image.png",
    );
  });

  it("copies ownership onto the thread post model", () => {
    const thread = mapForumPostPreviewToThreadPost(
      withOwnPostCapability(mapPostToForumPostPreview(listItem), "user-1"),
    );

    expect(thread.isOwnPost).toBe(true);
    expect(thread.anonymous).toBe(false);
  });
});

describe("applyUpdatedPostToPreview", () => {
  it("updates cached preview fields after an edit", () => {
    const existing = mapPostToForumPostPreview({
      id: "post-1",
      dao_group_id: "dao-1",
      author_id: "user-1",
      post_type: POST_TYPE.Question,
      title: "Old title",
      body: "Old body",
      anonymous: false,
      is_pinned: false,
      image_url: "https://example.supabase.co/forum-images/user/old.png",
      created_at: "2026-07-22T00:00:00.000Z",
      updated_at: null,
      comment_count: 2,
      view_count: 4,
      is_unread: false,
      author: {
        id: "user-1",
        username: "jordan",
        FirstName: "Jordan",
        LastName: "S",
        Name: "Jordan S.",
      },
      tags: ["Governance"],
    });

    const updated: Post = {
      id: "post-1",
      dao_group_id: "dao-1",
      author_id: "user-1",
      post_type: POST_TYPE.Discussion,
      title: "New title",
      body: "New body",
      anonymous: true,
      is_pinned: true,
      image_url: "https://example.supabase.co/forum-images/user/old.png",
      created_at: "2026-07-22T00:00:00.000Z",
      updated_at: "2026-08-13T00:00:00.000Z",
      deleted_at: null,
    };

    const preview = applyUpdatedPostToPreview(existing, updated, "user-1");

    expect(preview.title).toBe("New title");
    expect(preview.excerpt).toBe("New body");
    expect(preview.types).toEqual([POST_TYPE.Discussion]);
    expect(preview.anonymous).toBe(true);
    expect(preview.isPinned).toBe(true);
    expect(preview.imageUrl).toBe(
      "https://example.supabase.co/forum-images/user/old.png",
    );
    expect(preview.isOwnPost).toBe(true);
    expect(preview.commentCount).toBe(2);
  });
});
