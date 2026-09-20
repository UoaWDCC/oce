import { afterEach, describe, expect, it, vi } from "vitest";
import type { TokenUsageSummary } from "@/features/chatbot/types";
import {
  getTokenUsageLevel,
  isTokenLimitReached,
  scheduleTokenUsageRefresh,
} from "@/features/chatbot/hooks/useTokenUsage";

function usage(usedTokens: number): TokenUsageSummary {
  return {
    availableTokens: Math.max(0, 100 - usedTokens),
    usedTokens,
    totalTokens: 100,
    oldestMessage: null,
  };
}

describe("AI Tutor token usage state", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows no warning just below 80%", () => {
    expect(getTokenUsageLevel(usage(79.99))).toBe("none");
  });

  it("shows a warning at exactly 80%", () => {
    expect(getTokenUsageLevel(usage(80))).toBe("warning");
  });

  it("shows a warning just below 100%", () => {
    expect(getTokenUsageLevel(usage(99.99))).toBe("warning");
    expect(isTokenLimitReached(usage(99.99))).toBe(false);
  });

  it("reaches the limit and disables submission at exactly 100%", () => {
    expect(getTokenUsageLevel(usage(100))).toBe("limit");
    expect(isTokenLimitReached(usage(100))).toBe(true);
  });

  it("reaches the limit and disables submission above 100%", () => {
    expect(getTokenUsageLevel(usage(100.01))).toBe("limit");
    expect(isTokenLimitReached(usage(100.01))).toBe(true);
  });

  it("refreshes usage when the oldest counted message expires", () => {
    vi.useFakeTimers();
    const now = new Date("2026-08-26T12:00:00.000Z");
    vi.setSystemTime(now);
    const refresh = vi.fn();
    const limitedUsage = {
      ...usage(100),
      oldestMessage: "2026-08-25T13:00:00.000Z",
    };

    const cleanup = scheduleTokenUsageRefresh(limitedUsage, refresh);

    vi.advanceTimersByTime(60 * 60 * 1000 - 1);
    expect(refresh).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(refresh).toHaveBeenCalledOnce();
    cleanup?.();
  });

  it("delays a refresh when the reported expiry has already passed", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-26T12:00:00.000Z"));
    const refresh = vi.fn();
    const limitedUsage = {
      ...usage(100),
      oldestMessage: "2026-08-25T11:59:00.000Z",
    };

    const cleanup = scheduleTokenUsageRefresh(limitedUsage, refresh);

    vi.advanceTimersByTime(60 * 1000 - 1);
    expect(refresh).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(refresh).toHaveBeenCalledOnce();
    cleanup?.();
  });

  it("cancels a scheduled expiry refresh during cleanup", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-26T12:00:00.000Z"));
    const refresh = vi.fn();
    const limitedUsage = {
      ...usage(100),
      oldestMessage: "2026-08-25T13:00:00.000Z",
    };

    const cleanup = scheduleTokenUsageRefresh(limitedUsage, refresh);
    cleanup?.();
    vi.advanceTimersByTime(60 * 60 * 1000);

    expect(refresh).not.toHaveBeenCalled();
  });
});
