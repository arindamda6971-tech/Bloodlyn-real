import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { bridgeTestsQueryKey, fetchBridgeTests, type BridgeTest } from "@/hooks/useBridgeTests";
import { rankTests, understandQuery, type QueryUnderstanding } from "@/utils/search-intelligence";

// Enough to reach the common test inside broad server matches ("glucose" has ~30).
const PER_TERM_LIMIT = 40;

interface SmartTestSearch {
  results: BridgeTest[];
  understanding: QueryUnderstanding;
  /** True while any of the query's searches is still loading (results may already be partial). */
  isSearching: boolean;
  isError: boolean;
}

/**
 * Catalogue search that understands intent: "sugar" finds glucose tests, "liver
 * function test" finds LFT + SGPT/SGOT, "thyorid" finds thyroid. Runs the raw
 * query plus the concept's catalogue searches in parallel (each cached like any
 * other bridge-tests query) and ranks the merged results.
 */
export function useSmartTestSearch(
  query: string,
  { limit = 30, enabled = true, category }: { limit?: number; enabled?: boolean; category?: string } = {}
): SmartTestSearch {
  const understanding = useMemo(() => understandQuery(query), [query]);
  // Limit the search to one category's tests (server-side, so pages not yet loaded are included).
  const scope = category && category !== "all" ? category : undefined;

  const queries = useQueries({
    queries: understanding.serverTerms.map((term) => {
      const params = { search: term, limit: PER_TERM_LIMIT, ...(scope ? { category: scope } : {}) };
      return {
        queryKey: bridgeTestsQueryKey(params),
        queryFn: () => fetchBridgeTests(params),
        staleTime: 10 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
        retry: 1,
        enabled,
      };
    }),
  });

  // Re-rank only when some query's data actually changed.
  const dataVersion = queries.map((q) => q.dataUpdatedAt).join("|");
  const results = useMemo(() => {
    const merged = queries.flatMap((q) => q.data?.tests ?? []);
    return rankTests(merged, understanding).slice(0, limit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataVersion, understanding, limit]);

  return {
    results,
    understanding,
    isSearching: queries.some((q) => q.isFetching),
    isError: queries.length > 0 && queries.every((q) => q.isError),
  };
}
