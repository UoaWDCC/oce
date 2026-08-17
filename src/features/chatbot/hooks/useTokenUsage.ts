"use client";

import { useEffect, useState } from "react";
import { TokenUsageSummary } from "@/features/chatbot/types";
import { getTokenUsage } from "../api/tokenUsage";

// Strictly greater, matching the server check in the chat routes. Shared by the
// banner and the input so the two can never disagree about the boundary.
export function isOverTokenLimit(usage: TokenUsageSummary | null): boolean {
  return usage !== null && usage.usedTokens > usage.totalTokens;
}

// Refetches whenever refreshVersion changes, so usage stays current after each
// exchange. Returns null until the first load lands.
export function useTokenUsage(refreshVersion = 0) {
  const [usage, setUsage] = useState<TokenUsageSummary | null>(null);

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
  }, [refreshVersion]);

  return usage;
}
