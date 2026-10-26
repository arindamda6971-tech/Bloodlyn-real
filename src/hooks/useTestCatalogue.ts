import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { BridgeCategory, BridgeTest } from "@/hooks/useBridgeTests";
import {
  buildTestSearchIndexInBackground,
  getCachedTestSearchIndex,
  type TestSearchIndex,
} from "@/lib/test-search";

export interface CatalogueTest extends BridgeTest {
  /** Short consumer name from the Admin catalogue (short_name / component), when it differs. */
  display_name?: string | null;
}

export interface TestCatalogue {
  categories: BridgeCategory[];
  tests: CatalogueTest[];
  /** Active test count per category slug. */
  countsBySlug: Map<string, number>;
}

// Must start with "bridge-tests": App.tsx keeps those keys out of localStorage, because
// serializing the full catalogue synchronously blocks mobile route transitions.
export const TEST_CATALOGUE_QUERY_KEY = ["bridge-tests-catalogue", "v1"] as const;

/**
 * The whole active catalogue in ONE request (`all=true`).
 *
 * Paging per category capped every category at 500 tests, and per-keystroke search
 * requests ran into the proxy's shared rate limit. One cached copy lets categories,
 * counts and search all work on-device and instantly.
 */
export async function fetchTestCatalogue(): Promise<TestCatalogue> {
  const { data, error } = await supabase.functions.invoke("bridge-proxy", {
    body: {
      endpoint: "bridge-tests",
      method: "GET",
      params: { status: "active", all: "true", view: "user_app" },
    },
  });
  if (error) throw new Error(error.message || "Failed to fetch tests");
  if (!data?.success) throw new Error("Bridge API returned unsuccessful response");

  // Keep only what the app uses; LOINC codes, sync ids, timestamps and the duplicate
  // full name would otherwise sit in memory for the whole session.
  const countsBySlug = new Map<string, number>();
  const tests: CatalogueTest[] = (data.tests ?? []).map((t: CatalogueTest) => {
    if (t.category) countsBySlug.set(t.category, (countsBySlug.get(t.category) ?? 0) + 1);
    return {
      id: t.id,
      test_name: t.test_name,
      display_name: t.display_name && t.display_name !== t.test_name ? t.display_name : null,
      category: t.category,
      price: t.price,
      collection_fee: t.collection_fee,
      prerequisites: t.prerequisites,
      report_delivery_time: t.report_delivery_time,
      status: t.status,
    };
  });
  return { categories: (data.categories ?? []) as BridgeCategory[], tests, countsBySlug };
}

export const testCatalogueQueryOptions = {
  queryKey: TEST_CATALOGUE_QUERY_KEY,
  queryFn: fetchTestCatalogue,
  staleTime: 30 * 60 * 1000,
  gcTime: 6 * 60 * 60 * 1000,
  retry: 3,
  retryDelay: (attempt: number) => Math.min(1000 * 2 ** attempt, 8000),
};

export function useTestCatalogue() {
  return useQuery(testCatalogueQueryOptions);
}

/**
 * Search index for the loaded catalogue, shared by every screen. It is built in small
 * slices that yield to the browser (never one long task), and only once a screen
 * actually needs it. Returns null until it is ready — about a tenth of a second on a
 * low-end phone, once per session.
 */
export function useTestSearchIndex(tests: CatalogueTest[] | undefined, enabled = true) {
  const [index, setIndex] = useState<TestSearchIndex<CatalogueTest> | null>(() =>
    tests ? getCachedTestSearchIndex(tests) : null,
  );

  useEffect(() => {
    if (!tests || !enabled) return;
    const cached = getCachedTestSearchIndex(tests);
    if (cached) {
      setIndex(cached);
      return;
    }
    let cancelled = false;
    buildTestSearchIndexInBackground(tests).then((built) => {
      if (!cancelled) setIndex(built);
    });
    return () => {
      cancelled = true;
    };
  }, [tests, enabled]);

  return index && tests && getCachedTestSearchIndex(tests) === index ? index : null;
}
