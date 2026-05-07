import { useEffect, useRef } from "react";

/**
 * Hook to poll a function at regular intervals
 * Useful as a fallback when event listeners don't work
 */
export function usePolling(
  callback: () => void | Promise<void>,
  interval: number = 30000, // Default: 30 seconds
  enabled: boolean = true,
) {
  const savedCallback = useRef(callback);

  // Update ref when callback changes
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return;

    // Call immediately on mount
    savedCallback.current();

    // Then poll at interval
    const id = setInterval(() => {
      savedCallback.current();
    }, interval);

    return () => clearInterval(id);
  }, [interval, enabled]);
}
