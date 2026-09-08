"use client";

import { useEffect, useRef } from "react";

interface LoadMoreSentinelProps {
  onVisible: () => void;
  disabled?: boolean;
}

export default function LoadMoreSentinel({
  onVisible,
  disabled = false,
}: LoadMoreSentinelProps) {
  const ref = useRef<HTMLDivElement>(null);
  const onVisibleRef = useRef(onVisible);
  onVisibleRef.current = onVisible;

  useEffect(() => {
    const element = ref.current;
    if (!element || disabled) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) onVisibleRef.current();
      },
      { rootMargin: "120px" },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [disabled]);

  return <div ref={ref} aria-hidden className="h-px shrink-0" />;
}
