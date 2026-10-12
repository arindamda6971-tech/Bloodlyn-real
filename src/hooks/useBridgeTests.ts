import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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

interface BridgeTestsResponse {
  success: boolean;
  categories: BridgeCategory[];
  tests: BridgeTest[];
}

export interface BridgeTestsParams {
  category?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

async function fetchBridgeTests(params: BridgeTestsParams = {}): Promise<BridgeTestsResponse> {
  // Use user-provided limit, fallback to 20 for search/category, fallback to 0 if just fetching categories
  const limitStr = params.limit !== undefined ? String(params.limit) : 
                   (params.category || params.search ? "20" : "0");
  
  const queryParams: Record<string, string> = { 
    status: "active", 
    limit: limitStr
  };
  
  if (params.category) queryParams.category = params.category;
  if (params.search) queryParams.search = params.search;
  if (params.offset) queryParams.offset = String(params.offset);

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
    queryKey: ["bridge-tests-v2", JSON.stringify(params || {})],
    queryFn: () => fetchBridgeTests(params),
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // Keep in memory for 30 minutes
    retry: 2,
  });
}
