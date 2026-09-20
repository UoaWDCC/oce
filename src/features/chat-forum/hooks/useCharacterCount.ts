import { CONTENT_LIMITS, ContentLimitKey } from "../lib/contentLimits";

export function useCharacterCount(value: string, limitKey: ContentLimitKey) {
  const limit = CONTENT_LIMITS[limitKey];
  const count = value.length;
  const remaining = limit - count;
  const isAtLimit = count === limit;
  const isOverLimit = count > limit;
  const isNearLimit = remaining <= 20 && remaining >= 0;

  return { count, limit, remaining, isAtLimit, isOverLimit, isNearLimit };
}
