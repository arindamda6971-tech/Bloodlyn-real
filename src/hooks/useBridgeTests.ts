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

async function fetchBridgeTests(category?: string): Promise<BridgeTestsResponse> {
  const params: Record<string, string> = { status: "active", limit: "20000" };
  if (category) params.category = category;

  const { data, error } = await supabase.functions.invoke("bridge-proxy", {
    body: { endpoint: "bridge-tests", method: "GET", params },
  });

  if (error) throw new Error(error.message || "Failed to fetch tests");
  if (!data?.success) throw new Error("Bridge API returned unsuccessful response");
  return data;
}

export function useBridgeTests(category?: string) {
  return useQuery({
    queryKey: ["bridge-tests-v2", category],
    queryFn: () => fetchBridgeTests(category),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}
