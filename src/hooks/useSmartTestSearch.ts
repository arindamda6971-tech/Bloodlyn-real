import { useMemo } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { bridgeTestsQueryKey, fetchBridgeTests, type BridgeTest } from "@/hooks/useBridgeTests";
import { CATALOGUE_MAX_AGE_MS, CATALOGUE_QUERY_KEY, fetchCatalogue, searchCatalogue } from "@/lib/test-catalogue";
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
 * query plus the concept's catalogue searches and ranks the merged results. The
 * searches run on the device once the catalogue has loaded, and on the bridge
 * until then (each cached like any other bridge-tests query).
 */
export function useSmartTestSearch(
  query: string,
  { limit = 30, enabled = true, category }: { limit?: number; enabled?: boolean; category?: string } = {}
): SmartTestSearch {
  const understanding = useMemo(() => understandQuery(query), [query]);
  // Limit the search to one category's tests (server-side, so pages not yet loaded are included).
  const scope = category && category !== "all" ? category : undefined;

  const { data: catalogue } = useQuery({
    queryKey: CATALOGUE_QUERY_KEY,
    queryFn: fetchCatalogue,
    staleTime: CATALOGUE_MAX_AGE_MS,
    gcTime: CATALOGUE_MAX_AGE_MS,
    retry: 1,
    enabled,
  });
  const onDevice = !!catalogue?.length;

  const queries = useQueries({
    queries: understanding.serverTerms.map((term) => {
      const params = { search: term, limit: PER_TERM_LIMIT, ...(scope ? { category: scope } : {}) };
      return {
        queryKey: bridgeTestsQueryKey(params),
        queryFn: () => fetchBridgeTests(params),
        staleTime: 10 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
        retry: 1,
        enabled: enabled && !onDevice,
      };
    }),
  });

  // Re-rank only when some query's data actually changed.
  const dataVersion = queries.map((q) => q.dataUpdatedAt).join("|");
  const results = useMemo(() => {
    const merged = onDevice
      ? understanding.serverTerms.flatMap((term) => searchCatalogue(catalogue, term, scope)) as BridgeTest[]
      : queries.flatMap((q) => q.data?.tests ?? []);
    return rankTests(merged, understanding).slice(0, limit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataVersion, understanding, limit, catalogue, scope]);

  return {
    results,
    understanding,
    isSearching: !onDevice && queries.some((q) => q.isFetching),
    isError: !onDevice && queries.length > 0 && queries.every((q) => q.isError),
  };
}
