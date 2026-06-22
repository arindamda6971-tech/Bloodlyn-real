import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { CartProvider } from "@/contexts/CartContext";
import { AddressProvider } from "@/contexts/AddressContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import InstallPrompt from "@/components/InstallPrompt";
import ScrollToTop from "@/components/ScrollToTop";
import CapacitorBackButton from "@/components/CapacitorBackButton";
import ErrorBoundary from "@/components/ErrorBoundary";
import RouteFallback from "@/components/RouteFallback";
import RoutePrefetcher from "@/components/RoutePrefetcher";
import PageTransition from "@/components/PageTransition";
import SmoothRoutes from "@/components/SmoothRoutes";
import OfflineBanner from "@/components/OfflineBanner";
import PerformanceMonitor from "@/components/PerformanceMonitor";
import { Suspense, lazy, useEffect } from "react";
import { useAppLifecycle } from "@/hooks/useAppLifecycle";

// Critical path — eagerly loaded (shown before auth)
import SplashScreen from "./pages/SplashScreen";
import OnboardingScreen from "./pages/OnboardingScreen";
import LoginScreen from "./pages/LoginScreen";

// Stale-chunk recovery helper — when a hashed chunk 404s after a redeploy,
// clear caches/SW once and hard-reload so the new index.html (with fresh hashes) loads.
const RELOAD_KEY = "__chunk_reload_at";
const safeImport = <T,>(factory: () => Promise<T>): Promise<T> =>
  factory().catch(async (err) => {
    const msg = String(err?.message || err);
    const isChunkError =
      msg.includes("Failed to fetch dynamically imported module") ||
      msg.includes("Importing a module script failed") ||
      msg.includes("error loading dynamically imported module");
    if (!isChunkError) throw err;

    // Prevent infinite reload loops — only reload once per minute
    const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
    if (Date.now() - last < 60_000) throw err;
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));

    // Hard reload bypassing cache without destroying all caches
    window.location.replace(window.location.pathname + window.location.search);
    // Return a never-resolving promise so React's Suspense doesn't try to render
    return new Promise<T>(() => {});
  });

const CapacitorInitializer = () => {
  useEffect(() => {
    const initCapacitor = async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform()) return;
        
        const { StatusBar, Style } = await import("@capacitor/status-bar");
        const { SplashScreen } = await import("@capacitor/splash-screen");

        // Set Status Bar to light mode (dark text) and white background
        await StatusBar.setStyle({ style: Style.Light }).catch(() => {});
        await StatusBar.setBackgroundColor({ color: "#ffffff" }).catch(() => {});
        
        /*
        // Register for push notifications — DISABLED for now to prevent crash without google-services.json
        */

        // Hide splash screen smoothly after React has mounted and layout is done
        setTimeout(() => {
          SplashScreen.hide({
            fadeOutDuration: 500
          }).catch(() => {});
        }, 1500);
      } catch (err) {
        console.error("Capacitor Init Error:", err);
      }
    };
    
    initCapacitor();
  }, []);
  
  return null;
};

// All other screens — lazily loaded with auto-reload fallback
const LocationCheckScreen = lazy(() => safeImport(() => import("./pages/LocationCheckScreen")));
const InstallScreen = lazy(() => safeImport(() => import("./pages/InstallScreen")));
const HomeScreen = lazy(() => safeImport(() => import("./pages/HomeScreen")));
const CategoriesScreen = lazy(() => safeImport(() => import("./pages/CategoriesScreen")));
const CategoryTestsScreen = lazy(() => safeImport(() => import("./pages/CategoryTestsScreen")));
const TestDetailScreen = lazy(() => safeImport(() => import("./pages/TestDetailScreen")));
const TestSelectionScreen = lazy(() => safeImport(() => import("./pages/TestSelectionScreen")));
const CartScreen = lazy(() => safeImport(() => import("./pages/CartScreen")));
const LabSelectionScreen = lazy(() => safeImport(() => import("./pages/LabSelectionScreen")));
const PaymentScreen = lazy(() => safeImport(() => import("./pages/PaymentScreen")));
const BookingsScreen = lazy(() => safeImport(() => import("./pages/BookingsScreen")));
const ReportsScreen = lazy(() => safeImport(() => import("./pages/ReportsScreen")));
const ReportDetailScreen = lazy(() => safeImport(() => import("./pages/ReportDetailScreen")));
const ProfileScreen = lazy(() => safeImport(() => import("./pages/ProfileScreen")));
const EditProfileScreen = lazy(() => safeImport(() => import("./pages/EditProfileScreen")));
const NotificationsScreen = lazy(() => safeImport(() => import("./pages/NotificationsScreen")));
const SubscriptionScreen = lazy(() => safeImport(() => import("./pages/SubscriptionScreen")));
const SavedAddressesScreen = lazy(() => safeImport(() => import("./pages/SavedAddressesScreen")));
const DoctorConsultScreen = lazy(() => safeImport(() => import("./pages/DoctorConsultScreen")));
const PartnerLabsScreen = lazy(() => safeImport(() => import("./pages/PartnerLabsScreen")));
const LabDetailScreen = lazy(() => safeImport(() => import("./pages/LabDetailScreen")));
const PackagesScreen = lazy(() => safeImport(() => import("./pages/PackagesScreen")));
const PackageDetailScreen = lazy(() => safeImport(() => import("./pages/PackageDetailScreen")));
const UploadPrescriptionScreen = lazy(() => safeImport(() => import("./pages/UploadPrescriptionScreen")));
const SupportScreen = lazy(() => safeImport(() => import("./pages/SupportScreen")));
const PhysioConsultScreen = lazy(() => safeImport(() => import("./pages/PhysioConsultScreen")));
const PhysioBookingScreen = lazy(() => safeImport(() => import("./pages/PhysioBookingScreen")));
const ECGTestScreen = lazy(() => safeImport(() => import("./pages/ECGTestScreen")));
const ECGBookingScreen = lazy(() => safeImport(() => import("./pages/ECGBookingScreen")));
const ConsultationCallScreen = lazy(() => safeImport(() => import("./pages/ConsultationCallScreen")));
const ConsultationBookingScreen = lazy(() => safeImport(() => import("./pages/ConsultationBookingScreen")));
const OrderSuccessScreen = lazy(() => safeImport(() => import("./pages/OrderSuccessScreen")));
const TrackingScreen = lazy(() => safeImport(() => import("./pages/TrackingScreen")));
const FamilyMembersScreen = lazy(() => safeImport(() => import("./pages/FamilyMembersScreen")));
const AddFamilyMemberScreen = lazy(() => safeImport(() => import("./pages/AddFamilyMemberScreen")));
const PaymentMethodsScreen = lazy(() => safeImport(() => import("./pages/PaymentMethodsScreen")));
const TermsScreen = lazy(() => safeImport(() => import("./pages/TermsScreen")));
const NotFound = lazy(() => safeImport(() => import("./pages/NotFound")));
const UnauthorizedScreen = lazy(() => safeImport(() => import("./pages/UnauthorizedScreen")));

const AnimatedRoutes = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const edgeStartRef = { current: false } as { current: boolean };

  const handleDragStart = (_: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) => {
    // Only treat as a back-swipe if the gesture started near the left edge
    edgeStartRef.current = info.point.x <= 30;
  };

  const handleDragEnd = (_: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) => {
    if (!edgeStartRef.current) return;
    if (info.offset.x > 80 || info.velocity.x > 200) {
      navigate(-1);
    }
  };

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -16 }}
        transition={{ type: "tween", ease: [0.32, 0.72, 0, 1], duration: 0.22 }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0}
        dragDirectionLock
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        style={{
          width: "100%",
          position: "relative",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: "100dvh"
        }}
      >
        <Routes location={location}>
          {/* Public Routes */}
          <Route path="/" element={<SplashScreen />} />
          <Route path="/onboarding" element={<OnboardingScreen />} />
          <Route path="/login" element={<LoginScreen />} />
          <Route path="/install" element={<InstallScreen />} />

          {/* Location Gate */}
          <Route path="/location-check" element={<ProtectedRoute><LocationCheckScreen /></ProtectedRoute>} />

          {/* Protected Routes */}
          <Route path="/home" element={<ProtectedRoute><HomeScreen /></ProtectedRoute>} />
          <Route path="/categories" element={<ProtectedRoute><CategoriesScreen /></ProtectedRoute>} />
          <Route path="/category-tests" element={<ProtectedRoute><CategoryTestsScreen /></ProtectedRoute>} />
          <Route path="/test/select/:id" element={<ProtectedRoute><TestDetailScreen /></ProtectedRoute>} />
          <Route path="/test/select" element={<ProtectedRoute><TestDetailScreen /></ProtectedRoute>} />
          <Route path="/test/:id" element={<ProtectedRoute><TestDetailScreen /></ProtectedRoute>} />
          <Route path="/cart" element={<ProtectedRoute><CartScreen /></ProtectedRoute>} />
          <Route path="/lab-selection" element={<ProtectedRoute><LabSelectionScreen /></ProtectedRoute>} />
          <Route path="/payment" element={<ProtectedRoute><PaymentScreen /></ProtectedRoute>} />
          <Route path="/bookings" element={<ProtectedRoute><BookingsScreen /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute><ReportsScreen /></ProtectedRoute>} />
          <Route path="/report-detail" element={<ProtectedRoute><ReportDetailScreen /></ProtectedRoute>} />
          <Route path="/ai-report" element={<ProtectedRoute><ReportDetailScreen /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfileScreen /></ProtectedRoute>} />
          <Route path="/edit-profile" element={<ProtectedRoute><EditProfileScreen /></ProtectedRoute>} />
          <Route path="/saved-addresses" element={<ProtectedRoute><SavedAddressesScreen /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><NotificationsScreen /></ProtectedRoute>} />
          <Route path="/subscription" element={<ProtectedRoute><SubscriptionScreen /></ProtectedRoute>} />
          <Route path="/doctor-consult" element={<ProtectedRoute><DoctorConsultScreen /></ProtectedRoute>} />
          <Route path="/family-members" element={<ProtectedRoute><FamilyMembersScreen /></ProtectedRoute>} />
          <Route path="/add-family-member" element={<ProtectedRoute><AddFamilyMemberScreen /></ProtectedRoute>} />
          <Route path="/payment-methods" element={<ProtectedRoute><PaymentMethodsScreen /></ProtectedRoute>} />
          <Route path="/partner-labs" element={<ProtectedRoute><PartnerLabsScreen /></ProtectedRoute>} />
          <Route path="/lab/:labId" element={<ProtectedRoute><LabDetailScreen /></ProtectedRoute>} />
          <Route path="/package/:packageId" element={<ProtectedRoute><PackageDetailScreen /></ProtectedRoute>} />
          <Route path="/packages" element={<ProtectedRoute><PackagesScreen /></ProtectedRoute>} />
          <Route path="/upload-prescription" element={<ProtectedRoute><UploadPrescriptionScreen /></ProtectedRoute>} />
          <Route path="/support" element={<ProtectedRoute><SupportScreen /></ProtectedRoute>} />
          <Route path="/physio-consult" element={<ProtectedRoute><PhysioConsultScreen /></ProtectedRoute>} />
          <Route path="/physio-booking" element={<ProtectedRoute><PhysioBookingScreen /></ProtectedRoute>} />
          <Route path="/ecg-test" element={<ProtectedRoute><ECGTestScreen /></ProtectedRoute>} />
          <Route path="/ecg-booking" element={<ProtectedRoute><ECGBookingScreen /></ProtectedRoute>} />
          <Route path="/consultation-call" element={<ProtectedRoute><ConsultationCallScreen /></ProtectedRoute>} />
          <Route path="/consultation-booking" element={<ProtectedRoute><ConsultationBookingScreen /></ProtectedRoute>} />
          <Route path="/order-success" element={<ProtectedRoute><OrderSuccessScreen /></ProtectedRoute>} />
          <Route path="/tracking" element={<ProtectedRoute><TrackingScreen /></ProtectedRoute>} />
          <Route path="/tracking/:orderId" element={<ProtectedRoute><TrackingScreen /></ProtectedRoute>} />
          <Route path="/terms" element={<ProtectedRoute><TermsScreen /></ProtectedRoute>} />
          <Route path="/unauthorized" element={<UnauthorizedScreen />} />
          {/* Catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 min — avoid redundant refetches
      gcTime: 24 * 60 * 60 * 1000, // 24h — kept in localStorage persister so revisits hydrate instantly
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Persist query cache to device storage (Capacitor WebView localStorage is durable)
// so navigating back to a screen renders cached data immediately — no blank flash.
const persister = createSyncStoragePersister({
  storage: typeof window !== "undefined" ? window.localStorage : undefined,
  key: "bloodlyn-query-cache",
  throttleTime: 1000,
});



const App = () => {
  useAppLifecycle();

  return (
    <ErrorBoundary>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister, maxAge: 24 * 60 * 60 * 1000, buster: "v1" }}
      >
        <ThemeProvider>
          <AuthProvider>
            <CartProvider>
              <AddressProvider>
                <NotificationProvider>
                  <TooltipProvider>
                    <Toaster />
                    <Sonner />
                    <OfflineBanner />
                    <PerformanceMonitor />
                      <BrowserRouter>
                        <CapacitorInitializer />
                        <CapacitorBackButton />
                        <ScrollToTop />
                        <RoutePrefetcher />
                        <Suspense fallback={<RouteFallback />}>
<AnimatedRoutes />
                        </Suspense>
                        <InstallPrompt />
                      </BrowserRouter>
                  </TooltipProvider>
                </NotificationProvider>
              </AddressProvider>
            </CartProvider>
          </AuthProvider>
        </ThemeProvider>
      </PersistQueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
