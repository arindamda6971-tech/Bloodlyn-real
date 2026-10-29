import { infiniteQueryOptions, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeServerTerm } from "@/utils/search-intelligence";

export interface BridgeCategory {
  id: string;
  name: string;
  slug: string;
}

export interface BridgeTest {
  id: string;
  test_name: string;
  category: string;
  price: number;
  collection_fee: number;
  prerequisites: string;
  report_delivery_time: string;
  status: string;
}

export interface BridgePagination {
  page: number;
  pages: number;
  total: number;
  limit: number;
  has_more: boolean;
  next_page: number | null;
}

interface BridgeTestsResponse {
  success: boolean;
  categories: BridgeCategory[];
  tests: BridgeTest[];
  pagination?: BridgePagination;
}

export interface BridgeTestsParams {
  category?: string;
  search?: string;
  /** Page size; the bridge caps it at 500. */
  limit?: number;
  /** 1-based page number (the bridge ignores `offset`). */
  page?: number;
}

export const bridgeTestsQueryKey = (params?: BridgeTestsParams) => ["bridge-tests-v2", JSON.stringify(params || {})];

export async function fetchBridgeTests(params: BridgeTestsParams = {}): Promise<BridgeTestsResponse> {
  // Use user-provided limit, fallback to 20 for search/category, fallback to 0 if just fetching categories
  const limitStr = params.limit !== undefined ? String(params.limit) : 
                   (params.category || params.search ? "20" : "0");
  
  const queryParams: Record<string, string> = { 
    status: "active", 
    limit: limitStr
  };
  
  if (params.category) queryParams.category = params.category;
  // The bridge search fails on commas and brackets ("sgpt (alt)", "hemoglobin,").
  if (params.search) queryParams.search = sanitizeServerTerm(params.search);
  if (params.page && params.page > 1) queryParams.page = String(params.page);

  const { data, error } = await supabase.functions.invoke("bridge-proxy", {
    body: { endpoint: "bridge-tests", method: "GET", params: queryParams },
  });

  if (error) throw new Error(error.message || "Failed to fetch tests");
  if (!data?.success) throw new Error("Bridge API returned unsuccessful response");
  return data;
}

export function useBridgeTests(params?: BridgeTestsParams) {
  // We stringify the params to make a stable query key
  return useQuery({
    queryKey: bridgeTestsQueryKey(params),
    queryFn: () => fetchBridgeTests(params),
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // Keep in memory for 30 minutes
    retry: 2,
  });
}

// Small pages keep a category quick to open; more load as the user scrolls.
export const CATEGORY_PAGE_SIZE = 50;

/** A category's tests, page by page ("all" or empty = the whole catalogue). */
export const categoryTestsQueryOptions = (slug: string) => {
  const category = slug && slug !== "all" ? slug : undefined;
  return infiniteQueryOptions({
    queryKey: ["bridge-category-tests", category ?? "all"],
    queryFn: ({ pageParam }) => fetchBridgeTests({ category, limit: CATEGORY_PAGE_SIZE, page: pageParam }),
    initialPageParam: 1,
    // Asking past the last page makes the bridge fail, so follow its has_more flag.
    getNextPageParam: (last) => (last.pagination?.has_more ? last.pagination.next_page ?? last.pagination.page + 1 : undefined),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 2,
  });
};

export function useCategoryTests(slug: string) {
  return useInfiniteQuery(categoryTestsQueryOptions(slug));
}
