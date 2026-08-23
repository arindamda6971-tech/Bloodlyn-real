import React, { ReactNode, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useHaptics } from "@/hooks/useHaptics";

interface PredictiveLinkProps {
  to: string;
  children: ReactNode;
  className?: string;
  prefetchKey?: any[];
  prefetchFn?: () => Promise<any>;
}

/**
 * Ultra-Performance Link: starts prefetching data on 'touchstart' (or mousedown)
 * so that by the time the navigation transition finishes, the data is already in cache.
 */
export const PredictiveLink = ({
  to,
  children,
  className,
  prefetchKey,
  prefetchFn
}: PredictiveLinkProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { impactLight, impactMedium } = useHaptics();

  const triggerPrefetch = useCallback(() => {
    if (prefetchKey && prefetchFn) {
      queryClient.prefetchQuery({
        queryKey: prefetchKey,
        queryFn: prefetchFn,
        staleTime: 5 * 60 * 1000,
      });
    }
  }, [prefetchKey, prefetchFn, queryClient]);

  const handleStart = () => {
    triggerPrefetch();
    impactLight(); // Tactile confirmation that interaction has started
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    impactMedium(); // Stronger feedback on actual click/navigate
    navigate(to);
  };

  return (
    <div
      onClick={handleClick}
      onTouchStart={handleStart}
      onMouseDown={handleStart}
      className={className}
      style={{ cursor: 'pointer' }}
    >
      {children}
    </div>
  );
};
