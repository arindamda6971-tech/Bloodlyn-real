import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { CartProvider } from "@/contexts/CartContext";
import { AddressProvider } from "@/contexts/AddressContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import InstallPrompt from "@/components/InstallPrompt";
import ScrollToTop from "@/components/ScrollToTop";
import ErrorBoundary from "@/components/ErrorBoundary";
import RouteFallback from "@/components/RouteFallback";
import RoutePrefetcher from "@/components/RoutePrefetcher";
import PageTransition from "@/components/PageTransition";
import OfflineBanner from "@/components/OfflineBanner";
import { Suspense, lazy } from "react";

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

    try {
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
    } catch {
      /* ignore */
    }
    // Hard reload bypassing cache
    window.location.replace(window.location.pathname + window.location.search);
    // Return a never-resolving promise so React's Suspense doesn't try to render
    return new Promise<T>(() => {});
  });

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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 min — avoid redundant refetches
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => (
  <ErrorBoundary>
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <CartProvider>
          <AddressProvider>
            <NotificationProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <OfflineBanner />
              <BrowserRouter>
                <ScrollToTop />
                <RoutePrefetcher />
                <Suspense fallback={<RouteFallback />}>
                  <PageTransition>
                  <Routes>
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
                  </PageTransition>
                </Suspense>
                <InstallPrompt />
              </BrowserRouter>
            </TooltipProvider>
          </NotificationProvider>
          </AddressProvider>
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;