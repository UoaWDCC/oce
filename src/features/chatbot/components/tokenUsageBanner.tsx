import { TokenUsageSummary } from "@/features/chatbot/types";
import { isOverTokenLimit } from "../hooks/useTokenUsage";
import ErrorMessage from "./errorMessage";

// Fraction of the daily allowance at which the warning appears.
const WARNING_THRESHOLD = 0.8;
const USAGE_WINDOW_MS = 24 * 60 * 60 * 1000;

// The oldest counted message leaves the rolling window 24 hours after it was
// sent, which is the earliest point any allowance frees up. It is a lower bound
// rather than the moment the limit clears, so the copy says "more capacity
// from" instead of promising a reset.
function formatNextCapacity(oldestMessage: string | null): string | null {
  if (!oldestMessage) {
    return null;
  }

  const freesUpAt = new Date(
    new Date(oldestMessage).getTime() + USAGE_WINDOW_MS,
  );

  if (Number.isNaN(freesUpAt.getTime())) {
    return null;
  }

  return freesUpAt.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function getBanner(usage: TokenUsageSummary | null) {
  if (!usage) {
    return null;
  }

  if (isOverTokenLimit(usage)) {
    const nextCapacity = formatNextCapacity(usage.oldestMessage);

    return {
      variant: "error" as const,
      message: nextCapacity
        ? `Daily AI Tutor limit reached. More capacity from ${nextCapacity}.`
        : "Daily AI Tutor limit reached. Capacity frees up over the next 24 hours.",
    };
  }

  if (usage.usedTokens >= usage.totalTokens * WARNING_THRESHOLD) {
    return {
      variant: "warning" as const,
      message: "You are close to your daily AI Tutor limit.",
    };
  }

  return null;
}

export default function TokenUsageBanner({
  usage,
}: {
  usage: TokenUsageSummary | null;
}) {
  const banner = getBanner(usage);

  if (!banner) {
    return null;
  }

  return (
    <div className="z-10 w-full shrink-0 px-4 pt-4">
      <ErrorMessage message={banner.message} variant={banner.variant} />
    </div>
  );
}
