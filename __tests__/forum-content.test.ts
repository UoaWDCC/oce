import { describe, expect, it } from "vitest";
import {
  forumContentToPlainText,
  hasMeaningfulForumContent,
  hasValidPostTitle,
  normalizePostTitle,
  trimTrailingEmptyParagraphs,
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

  it.each([[null], [undefined], [123], [""], ["   "], ["\u00A0"]])(
    "rejects blank or whitespace-only titles: %s",
    (content) => {
      expect(hasValidPostTitle(content)).toBe(false);
    },
  );

  it.each(["Hello", "   Hello   "])(
    "accept values with trimming: %s",
    (content) => {
      expect(hasValidPostTitle(content)).toBe(true);
    },
  );

  it.each([
    ["   H  ello    ", "H  ello"],
    ["  Hello\u00A0", "Hello"],
  ])("normalise title: %s -> %s", (input, expected) => {
    expect(normalizePostTitle(input)).toBe(expected);
  });

  it.each([
    ["<p>hi</p><p><br></p>", "<p>hi</p>"],
    ["<p>hi</p><p><br></p><p><br></p>", "<p>hi</p>"],
    ["No Changes", "No Changes"],
    ["<p><br></p><p>hi</p>", "<p><br></p><p>hi</p>"],
    ["<div>hi</div><div><br></div><div><br></div>", "<div>hi</div>"],
    ["<p>hi</p><div>&nbsp;</div><div><br></div>", "<p>hi</p>"],
  ])("trims trailing paragraphs: %s -> %s", (input, expected) => {
    expect(trimTrailingEmptyParagraphs(input)).toBe(expected);
  });
});
