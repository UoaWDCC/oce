import { describe, expect, it } from "vitest";
import { isPostUnread } from "@/features/chat-forum/readState";

describe("isPostUnread", () => {
  it("marks a post unread when it has never been viewed", () => {
    expect(isPostUnread(null, null)).toBe(true);
    expect(isPostUnread(undefined, "2026-08-19T12:00:00.000Z")).toBe(true);
  });

  it("marks a viewed post as read when it has no comments", () => {
    expect(isPostUnread("2026-08-19T12:00:00.000Z", null)).toBe(false);
  });

  it("marks a post unread when a comment was added after the last view", () => {
    expect(
      isPostUnread("2026-08-19T12:00:00.000Z", "2026-08-19T12:00:01.000Z"),
    ).toBe(true);
  });

  it("keeps a post read when its latest comment predates the last view", () => {
    expect(
      isPostUnread("2026-08-19T12:00:00.000Z", "2026-08-19T11:59:59.000Z"),
    ).toBe(false);
  });

  it("does not treat a comment at the exact view time as newer", () => {
    expect(
      isPostUnread("2026-08-19T12:00:00.000Z", "2026-08-19T12:00:00.000Z"),
    ).toBe(false);
  });
});
