import { describe, expect, it } from "vitest";
import { POST_TYPE, type ForumCommentPreview } from "@app-types/dao-forum";
import {
  buildForumThreadComments,
  mapCommentToForumCommentPreview,
  mapPostSubmitPayloadToCreatePostFields,
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
