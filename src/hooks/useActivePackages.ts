import { useQuery } from "@tanstack/react-query";
import { ACTIVE_PACKAGES_QUERY_KEY, fetchActivePackages, type HealthPackage } from "@/lib/health-packages";

const FRESH_MS = 5 * 60 * 1000;

/**
 * Packages stay fresh for 5 minutes, but an empty list never does: it may come
 * from a bad moment (a lab briefly off, a session still loading), and this
 * cache survives app restarts. So "none" is always asked again.
 */
export const packagesStaleTime = (data: HealthPackage[] | undefined) => (data?.length ? FRESH_MS : 0);

export function useActivePackages() {
  return useQuery({
    queryKey: ACTIVE_PACKAGES_QUERY_KEY,
    queryFn: fetchActivePackages,
    staleTime: (query) => packagesStaleTime(query.state.data),
    retry: 2,
  });
}
