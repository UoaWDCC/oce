const DEFAULT_MAX_DAILY_TOKENS = 100000;
const USAGE_WINDOW_MS = 12 * 60 * 60 * 1000;

export function getMaxDailyTokens(): number {
  const configuredValue = process.env.MAX_DAILY_TOKENS;

  if (!configuredValue || !/^\d+$/.test(configuredValue)) {
    return DEFAULT_MAX_DAILY_TOKENS;
  }

  const parsedValue = Number(configuredValue);

  return Number.isSafeInteger(parsedValue) && parsedValue > 0
    ? parsedValue
    : DEFAULT_MAX_DAILY_TOKENS;
}

export function estimateTokenUsage(contents: string[]): number {
  return contents.reduce((total, content) => total + content.length, 0) / 4;
}

export function getUsageWindow(now = new Date()) {
  return {
    start: new Date(now.getTime() - USAGE_WINDOW_MS),
    end: now,
  };
}
