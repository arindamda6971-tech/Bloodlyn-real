import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useUserPincode } from "@/hooks/useUserPincode";
import {
  ACTIVE_PACKAGES_QUERY_KEY,
  fetchActivePackages,
  packagesForPincode,
  type HealthPackage,
} from "@/lib/health-packages";

const FRESH_MS = 5 * 60 * 1000;

/**
 * Packages stay fresh for 5 minutes, but an empty list never does: it may come
 * from a bad moment (a lab briefly off, a session still loading), and this
 * cache survives app restarts. So "none" is always asked again.
 */
export const packagesStaleTime = (data: HealthPackage[] | undefined) => (data?.length ? FRESH_MS : 0);

/**
 * Active packages from labs that collect at the user's PIN, the same rule the
 * Home lab list uses. The full list is fetched and cached once; changing PIN
 * only re-filters it.
 */
export function useActivePackages() {
  const { pincode, loading: pincodeLoading } = useUserPincode();
  const query = useQuery({
    queryKey: ACTIVE_PACKAGES_QUERY_KEY,
    queryFn: fetchActivePackages,
    staleTime: (q) => packagesStaleTime(q.state.data),
    retry: 2,
  });

  const data = useMemo(
    () => (query.data ? packagesForPincode(query.data, pincode) : query.data),
    [query.data, pincode],
  );

  // Until the user's PIN is known, don't flash packages from other areas.
  return { ...query, data: pincodeLoading ? undefined : data, isLoading: query.isLoading || pincodeLoading };
}
