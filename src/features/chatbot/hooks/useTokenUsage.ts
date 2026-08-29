"use client";

import { useEffect, useState } from "react";
import { TokenUsageSummary } from "@/features/chatbot/types";
import { getTokenUsage } from "../api/tokenUsage";

export const USAGE_WINDOW_MS = 24 * 60 * 60 * 1000;
const MIN_REFRESH_DELAY_MS = 60 * 1000;
const WARNING_THRESHOLD = 0.8;

export function isTokenLimitReached(usage: TokenUsageSummary | null): boolean {
  return usage !== null && usage.usedTokens >= usage.totalTokens;
}

export function getTokenUsageLevel(
  usage: TokenUsageSummary | null,
): "none" | "warning" | "limit" {
  if (!usage) return "none";
  if (isTokenLimitReached(usage)) return "limit";
  if (usage.usedTokens >= usage.totalTokens * WARNING_THRESHOLD) {
    return "warning";
  }
  return "none";
}

export function scheduleTokenUsageRefresh(
  usage: TokenUsageSummary | null,
  refresh: () => void,
  now = Date.now(),
): (() => void) | undefined {
  if (!isTokenLimitReached(usage) || !usage?.oldestMessage) {
    return undefined;
  }

  const oldestMessageTime = new Date(usage.oldestMessage).getTime();
  if (Number.isNaN(oldestMessageTime)) {
    return undefined;
  }

  const timeUntilExpiry = oldestMessageTime + USAGE_WINDOW_MS - now;
  const delay = timeUntilExpiry > 0 ? timeUntilExpiry : MIN_REFRESH_DELAY_MS;
  const timer = setTimeout(refresh, delay);

  return () => clearTimeout(timer);
}

// Refetches whenever refreshVersion changes, so usage stays current after each
// exchange. Returns null until the first load lands.
export function useTokenUsage(refreshVersion = 0) {
  const [usage, setUsage] = useState<TokenUsageSummary | null>(null);
  const [expiryRefreshVersion, setExpiryRefreshVersion] = useState(0);

  useEffect(() => {
    let ignore = false;

    async function loadUsage() {
      try {
        const data = await getTokenUsage();
        if (ignore) return;
        setUsage(data);
      } catch (err) {
        // Usage display is advisory. A failed fetch leaves the last known value
        // and must never block sending; the server still enforces the limit.
        console.error("Failed to load AI tutor token usage:", err);
      }
    }

    loadUsage();

    return () => {
      ignore = true;
    };
  }, [refreshVersion, expiryRefreshVersion]);

  useEffect(
    () =>
      scheduleTokenUsageRefresh(usage, () => {
        setExpiryRefreshVersion((version) => version + 1);
      }),
    [usage, expiryRefreshVersion],
  );

  return usage;
}
