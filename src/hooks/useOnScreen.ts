import { RefObject, useEffect, useState } from "react";

export default function useOnScreen(
  ref: RefObject<HTMLDivElement | null>,
  rootMargin = "-90px",
) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (ref.current == null) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { rootMargin },
    );
    observer.observe(ref.current);
    return () => {
      if (ref.current == null) return;
      observer.unobserve(ref.current);
    };
  }, [ref.current]);
  return isVisible;
}
