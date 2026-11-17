import { afterEach, expect, it } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { usePostDraft } from "../usePostDraft";

afterEach(() => {
  cleanup();
  localStorage.clear();
});

it("preserves old drafts while dropping their unused pin flag", async () => {
  const key = "forum_post_draft:user-1:dao-1";
  localStorage.setItem(
    key,
    JSON.stringify({
      title: "Existing draft",
      body: "Keep my text",
      postType: "Discussion",
      anonymous: false,
      isPinned: true,
      version: 1,
    }),
  );
  const { result } = renderHook(() => usePostDraft("user-1", "dao-1"));
  await waitFor(() => expect(result.current.isLoaded).toBe(true));
  expect(result.current.draft).toMatchObject({
    title: "Existing draft",
    body: "Keep my text",
  });
  expect(result.current.draft).not.toHaveProperty("isPinned");
  act(() =>
    result.current.saveDraft({
      title: "Edited draft",
      body: "Updated text",
      postType: "Discussion",
      anonymous: false,
    }),
  );
  expect(JSON.parse(localStorage.getItem(key)!)).not.toHaveProperty("isPinned");
});
