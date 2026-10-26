import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Mounts a long list a batch at a time: the next batch is added when the sentinel
 * nears the viewport. A category with 1,000+ tests opens as fast as one with 10,
 * and nothing heavy runs while the page is sliding in.
 */
export function useIncrementalList<T>(items: T[], batchSize = 30) {
  const [count, setCount] = useState(batchSize);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // A new list (new search or category) starts again from the first batch.
  useEffect(() => {
    setCount(batchSize);
  }, [items, batchSize]);

  const hasMore = count < items.length;

  const revealMore = useCallback(() => {
    setCount((current) => Math.min(current + batchSize, items.length));
  }, [batchSize, items.length]);

  useEffect(() => {
    const target = sentinelRef.current;
    if (!target || !hasMore) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) revealMore();
      },
      { rootMargin: "400px 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, revealMore, count]);

  return { visible: items.slice(0, count), hasMore, sentinelRef };
}
