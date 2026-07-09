import { describe, expect, it } from "vitest";
import { POST_TYPE } from "@app-types/dao-forum";
import { mapPostSubmitPayloadToCreatePostFields } from "@/features/chat-forum/mappers";

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
});
