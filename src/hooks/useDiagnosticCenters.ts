import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { labServesPincode } from "@/hooks/useUserPincode";

export interface DiagnosticCenter {
  id: string;
  name: string;
  rating: number;
  reviews_count: number;
  logo_url?: string;
  service_pincodes?: string[];
}

export function useDiagnosticCenters(userPincode?: string | null) {
  return useQuery({
    queryKey: ["diagnostic-centers", userPincode],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("diagnostic_centers")
        .select("*")
        .order("rating", { ascending: false });

      if (error) throw error;

      if (userPincode) {
        return data.filter((c) => labServesPincode(c as any, userPincode));
      }

      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}
