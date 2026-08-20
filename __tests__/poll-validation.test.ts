import { describe, expect, it } from "vitest";
import { validateAndNormalizePoll } from "@/features/chat-forum/polls";

describe("poll validation", () => {
  it("normalizes a valid multiple-choice poll", () => {
    const result = validateAndNormalizePoll({
      question: "  Which actions should we take?  ",
      options: ["  Fund it ", "Delay"],
      allow_multiple: true,
    });

    expect(result).toEqual({
      poll: {
        question: "Which actions should we take?",
        options: ["Fund it", "Delay"],
        allow_multiple: true,
      },
    });
  });

  it("rejects fewer than two options", () => {
    expect(
      validateAndNormalizePoll({
        question: "Proceed?",
        options: ["Yes"],
        allow_multiple: false,
      }).error,
    ).toContain("2-6 options");
  });

  it("rejects case-insensitive duplicate options", () => {
    expect(
      validateAndNormalizePoll({
        question: "Proceed?",
        options: ["Yes", " yes "],
        allow_multiple: false,
      }).error,
    ).toBe("Poll options must be unique");
  });
});
