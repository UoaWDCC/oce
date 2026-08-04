import { describe, expect, it } from "vitest";
import { validateForumImageFile } from "@/features/chat-forum/hooks/useForumImageUpload";

const FIVE_MEGABYTES = 5 * 1024 * 1024;

describe("validateForumImageFile", () => {
  it.each(["image/jpeg", "image/png", "image/gif", "image/webp"])(
    "accepts %s images",
    (type) => {
      expect(validateForumImageFile({ type, size: 1024 })).toBeNull();
    },
  );

  it("accepts a file exactly at the 5MB limit", () => {
    expect(
      validateForumImageFile({ type: "image/png", size: FIVE_MEGABYTES }),
    ).toBeNull();
  });

  it("rejects files larger than 5MB", () => {
    expect(
      validateForumImageFile({
        type: "image/png",
        size: FIVE_MEGABYTES + 1,
      }),
    ).toBe("File too large. Maximum size is 5MB.");
  });

  it("rejects unsupported file types", () => {
    expect(validateForumImageFile({ type: "image/svg+xml", size: 1024 })).toBe(
      "Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.",
    );
  });
});
