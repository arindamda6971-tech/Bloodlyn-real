import { useEffect } from "react";

/**
 * Warms up lazy route chunks during idle time after first paint.
 * This makes subsequent in-app navigations effectively instant
 * (the chunk is already cached) — eliminating the brief blank
 * screen users see between clicking a button and the next page
 * rendering. Runs once, after authentication-critical paint.
 */
const prefetchers: Array<() => Promise<unknown>> = [
  () => import("@/pages/HomeScreen"),
  () => import("@/pages/CategoriesScreen"),
  () => import("@/pages/CategoryTestsScreen"),
  () => import("@/pages/TestDetailScreen"),
  () => import("@/pages/TestSelectionScreen"),
  () => import("@/pages/CartScreen"),
  () => import("@/pages/LabSelectionScreen"),
  () => import("@/pages/PaymentScreen"),
  () => import("@/pages/BookingsScreen"),
  () => import("@/pages/ReportsScreen"),
  () => import("@/pages/ReportDetailScreen"),
  () => import("@/pages/ProfileScreen"),
  () => import("@/pages/EditProfileScreen"),
  () => import("@/pages/NotificationsScreen"),
  () => import("@/pages/SubscriptionScreen"),
  () => import("@/pages/SavedAddressesScreen"),
  () => import("@/pages/PartnerLabsScreen"),
  () => import("@/pages/LabDetailScreen"),
  () => import("@/pages/PackagesScreen"),
  () => import("@/pages/PackageDetailScreen"),
  () => import("@/pages/SupportScreen"),
  () => import("@/pages/TrackingScreen"),
  () => import("@/pages/OrderSuccessScreen"),
  () => import("@/pages/FamilyMembersScreen"),
  () => import("@/pages/AddFamilyMemberScreen"),
  () => import("@/pages/LocationCheckScreen"),
];

const RoutePrefetcher = () => {
  useEffect(() => {
    const ric =
      (window as unknown as {
        requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      }).requestIdleCallback ??
      ((cb: () => void) => window.setTimeout(cb, 1500));

    let cancelled = false;
    const handle = ric(() => {
      if (cancelled) return;
      // Stagger imports so we don't saturate the network at once.
      prefetchers.forEach((load, i) => {
        window.setTimeout(() => {
          if (!cancelled) void load().catch(() => {});
        }, i * 80);
      });
    }, { timeout: 4000 });

    return () => {
      cancelled = true;
      const cic = (window as unknown as { cancelIdleCallback?: (h: number) => void })
        .cancelIdleCallback;
      if (cic && typeof handle === "number") cic(handle);
    };
  }, []);

  return null;
};

export default RoutePrefetcher;
