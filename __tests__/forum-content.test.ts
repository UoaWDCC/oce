import { describe, expect, it } from "vitest";
import {
  forumContentToPlainText,
  hasMeaningfulForumContent,
} from "@/utils/forumContent";

describe("forum content", () => {
  it("converts rich-text HTML to readable preview text", () => {
    expect(
      forumContentToPlainText(
        "<div><strong>Bold</strong> and <em>italic</em></div><ul><li>Item</li></ul>",
      ),
    ).toBe("Bold and italic\nItem");
  });

  it.each(["", "   ", "<u></u>", "<ul><li><br></li></ul>", "****"])(
    "rejects visually empty content: %s",
    (content) => {
      expect(hasMeaningfulForumContent(content)).toBe(false);
    },
  );

  it.each([
    "Plain text",
    "<strong>Bold</strong>",
    "<ul><li>List item</li></ul>",
    "**Legacy Markdown**",
  ])("accepts visible content: %s", (content) => {
    expect(hasMeaningfulForumContent(content)).toBe(true);
  });
});
