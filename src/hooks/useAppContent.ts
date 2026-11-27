import { useQuery } from "@tanstack/react-query";
import { CONTENT_CACHE_MS, fetchAppContent, type AppContent } from "@/lib/app-content";

/**
 * The pages and FAQ questions Admin has for the patient app, or null when Admin can't be
 * reached: screens then keep their built-in text. Not reported as an error.
 */
export function useAppContent() {
  return useQuery<AppContent | null>({
    queryKey: ["app-content", "user_app"],
    queryFn: () => fetchAppContent("user_app").catch(() => null),
    staleTime: CONTENT_CACHE_MS,
    gcTime: CONTENT_CACHE_MS * 2,
    retry: false,
    refetchOnWindowFocus: false,
  });
}
