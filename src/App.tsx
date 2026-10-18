import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryCache, MutationCache } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigationType } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { recordNavigation, getTransitionDuration } from "@/lib/navigation-transition";

import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { CartProvider } from "@/contexts/CartContext";
import { AddressProvider } from "@/contexts/AddressContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import InstallPrompt from "@/components/InstallPrompt";
import ScrollToTop from "@/components/ScrollToTop";
import BootReadySignal from "@/components/BootReadySignal";
import CapacitorBackButton from "@/components/CapacitorBackButton";
import ErrorBoundary from "@/components/ErrorBoundary";
import RouteFallback from "@/components/RouteFallback";
import RoutePrefetcher from "@/components/RoutePrefetcher";
import PageTransition from "@/components/PageTransition";
import OfflineBanner from "@/components/OfflineBanner";
import AppOpeningAnimation from "@/components/AppOpeningAnimation";
import DataWarmup from "@/components/DataWarmup";
import NativeChrome from "@/components/NativeChrome";
import LocationCheckScreen from "./pages/LocationCheckScreen";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, memo } from "react";
import { useAppLifecycle } from "@/hooks/useAppLifecycle";
import { IncomingCallListener } from "@/components/IncomingCallListener";
import DoctorAvailabilityListener from "@/components/DoctorAvailabilityListener";
import AppointmentStatusListener from "@/components/AppointmentStatusListener";
import { useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";

// Core Navigation & High-Traffic Screens imported statically
// Guaranteed in memory at boot: 0ms delay, no Suspense skeleton flash mid-slide!
import HomeScreen from "./pages/HomeScreen";
import CategoriesScreen from "./pages/CategoriesScreen";
import CategoryTestsScreen from "./pages/CategoryTestsScreen";
import TestDetailScreen from "./pages/TestDetailScreen";
import CartScreen from "./pages/CartScreen";
import BookingsScreen from "./pages/BookingsScreen";
import ReportsScreen from "./pages/ReportsScreen";
import ProfileScreen from "./pages/ProfileScreen";
import DoctorConsultScreen from "./pages/DoctorConsultScreen";
import ECGTestScreen from "./pages/ECGTestScreen";
import BPCheckScreen from "./pages/BPCheckScreen";
import PhysioConsultScreen from "./pages/PhysioConsultScreen";
import LabSelectionScreen from "./pages/LabSelectionScreen";
import PaymentScreen from "./pages/PaymentScreen";

import SplashScreen from "./pages/SplashScreen";
import OnboardingScreen from "./pages/OnboardingScreen";
import LoginScreen from "./pages/LoginScreen";
import InstallScreen from "./pages/InstallScreen";
import TestSelectionScreen from "./pages/TestSelectionScreen";
import PaymentProcessingScreen from "./pages/PaymentProcessingScreen";
import ReportDetailScreen from "./pages/ReportDetailScreen";
import EditProfileScreen from "./pages/EditProfileScreen";
import NotificationsScreen from "./pages/NotificationsScreen";
import SubscriptionScreen from "./pages/SubscriptionScreen";
import SavedAddressesScreen from "./pages/SavedAddressesScreen";
import SavedLabsScreen from "./pages/SavedLabsScreen";
import PartnerLabsScreen from "./pages/PartnerLabsScreen";
import LabDetailScreen from "./pages/LabDetailScreen";
import PackagesScreen from "./pages/PackagesScreen";
import PackageDetailScreen from "./pages/PackageDetailScreen";
import SupportScreen from "./pages/SupportScreen";
import ConsultationCallScreen from "./pages/ConsultationCallScreen";
import EmbeddedCallScreen from "./pages/EmbeddedCallScreen";
import OrderSuccessScreen from "./pages/OrderSuccessScreen";
import TrackingScreen from "./pages/TrackingScreen";
import FamilyMembersScreen from "./pages/FamilyMembersScreen";
import AddFamilyMemberScreen from "./pages/AddFamilyMemberScreen";

import TermsScreen from "./pages/TermsScreen";
import PrivacyPolicyScreen from "./pages/PrivacyPolicyScreen";
import DataAttributionScreen from "./pages/DataAttributionScreen";
import ECGDoctorsScreen from "./pages/ECGDoctorsScreen";
import NotFound from "./pages/NotFound";
import UnauthorizedScreen from "./pages/UnauthorizedScreen";
import UploadPrescriptionScreen from "./pages/UploadPrescriptionScreen";
import PolicyDetailScreen from "./pages/PolicyDetailScreen";
import TicketDetailScreen from "./pages/TicketDetailScreen";
import TicketHistoryScreen from "./pages/TicketHistoryScreen";

import { Suspense } from "react";


const CapacitorInitializer = () => {
  useEffect(() => {
    // Initializer logic can go here if needed
  }, []);
  return null;
};

/**
 * High-Performance Native Stack Navigator.
 * Uses PageTransition for physical "Native-Feel" CSS animation.
 * RoutePrefetcher preloads all chunks so Suspense resolves instantly.
 */
interface HomeStackLayerProps {
  active: boolean;
}

/**
 * Persistent Base Layer for HomeScreen.
 * Remains mounted in the DOM to preserve DOM tree, decoded GPU image textures,
 * and scroll offset at zero idle cost.
 *
 * IMPORTANT: HomeScreen does NOT play its own slide animation. The incoming/
 * outgoing PageTransition already animates. Having TWO simultaneous translate3d
 * animations on overlapping layers is the #1 cause of frame drops on Android
 * WebView. Instead, HomeScreen uses instant visibility + a lightweight opacity
 * crossfade for the "reveal" effect.
 */
const HomeStackLayer = memo(({ active }: HomeStackLayerProps) => {
  // When active is true, it is ALWAYS visible immediately.
  // When navigating away (active becomes false), keep it visible until the push transition settles.
  const [stayVisibleWhileExiting, setStayVisibleWhileExiting] = useState(false);
  const prevActiveRef = useRef(active);

  useLayoutEffect(() => {
    const wasActive = prevActiveRef.current;
    prevActiveRef.current = active;

    if (!active && wasActive) {
      // Navigating away from home — keep layer visible until incoming screen finishes sliding in
      setStayVisibleWhileExiting(true);
      const timer = setTimeout(() => {
        setStayVisibleWhileExiting(false);
      }, getTransitionDuration() + 40);
      return () => clearTimeout(timer);
    } else if (active) {
      setStayVisibleWhileExiting(false);
    }
  }, [active]);

  const isVisible = active || stayVisibleWhileExiting;

  return (
    <div
      className="home-stack w-full h-full absolute top-0 left-0 bg-background overflow-hidden"
      data-home-active={active ? "true" : "false"}
      style={{
        zIndex: 1,
        visibility: isVisible ? "visible" : "hidden",
        pointerEvents: active ? "auto" : "none",
        WebkitOverflowScrolling: "touch",
        contain: "layout paint",
        backfaceVisibility: "hidden",
      }}
    >
      <ProtectedRoute>
        <HomeScreen />
      </ProtectedRoute>
    </div>
  );
});

HomeStackLayer.displayName = "HomeStackLayer";

/**
 * High-Performance Native Stack Navigator.
 * Uses PageTransition for physical "Native-Feel" CSS animation.
 * RoutePrefetcher preloads all chunks so Suspense resolves instantly.
 */
const AnimatedRoutes = () => {
  const location = useLocation();
  const navType = useNavigationType();
  const { user } = useAuth();
  recordNavigation(location.pathname, navType);

  const isHome = location.pathname === "/home";
  const [hasVisitedHome, setHasVisitedHome] = useState(isHome);
  const [showAppSplash, setShowAppSplash] = useState(true);

  useEffect(() => {
    if (user && isHome && !hasVisitedHome) {
      setHasVisitedHome(true);
    }
    if (!user && hasVisitedHome) {
      setHasVisitedHome(false);
    }
  }, [user, isHome, hasVisitedHome]);

  return (
    <>
      {showAppSplash && (
        <AppOpeningAnimation onComplete={() => setShowAppSplash(false)} />
      )}
      {hasVisitedHome && <HomeStackLayer active={isHome} />}
      <AnimatePresence initial={false}>
        {!isHome && (
          <PageTransition location={location} key={location.pathname}>
            <Suspense fallback={<RouteFallback />}>
              <Routes location={location}>
                {/* Public Routes */}
                <Route path="/" element={<SplashScreen />} />
                <Route path="/onboarding" element={<OnboardingScreen />} />
                <Route path="/login" element={<LoginScreen />} />
                <Route path="/install" element={<InstallScreen />} />

                {/* Location Gate */}
                <Route path="/location-check" element={<ProtectedRoute><LocationCheckScreen /></ProtectedRoute>} />

                {/* Protected Routes */}
                <Route path="/home" element={null} />
                <Route path="/categories" element={<ProtectedRoute><CategoriesScreen /></ProtectedRoute>} />
                <Route path="/category-tests" element={<ProtectedRoute><CategoryTestsScreen /></ProtectedRoute>} />
                <Route path="/test/select/:id" element={<ProtectedRoute><TestDetailScreen /></ProtectedRoute>} />
                <Route path="/test/select" element={<ProtectedRoute><TestDetailScreen /></ProtectedRoute>} />
                <Route path="/test/:id" element={<ProtectedRoute><TestDetailScreen /></ProtectedRoute>} />
                <Route path="/cart" element={<ProtectedRoute><CartScreen /></ProtectedRoute>} />
                <Route path="/lab-selection" element={<ProtectedRoute><LabSelectionScreen /></ProtectedRoute>} />
                <Route path="/payment" element={<ProtectedRoute><PaymentScreen /></ProtectedRoute>} />
                <Route path="/payment-processing" element={<ProtectedRoute><PaymentProcessingScreen /></ProtectedRoute>} />
                <Route path="/bookings" element={<ProtectedRoute><BookingsScreen /></ProtectedRoute>} />
                <Route path="/reports" element={<ProtectedRoute><ReportsScreen /></ProtectedRoute>} />
                <Route path="/report-detail" element={<ProtectedRoute><ReportDetailScreen /></ProtectedRoute>} />
                <Route path="/ai-report" element={<ProtectedRoute><ReportDetailScreen /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><ProfileScreen /></ProtectedRoute>} />
                <Route path="/edit-profile" element={<ProtectedRoute><EditProfileScreen /></ProtectedRoute>} />
                <Route path="/saved-addresses" element={<ProtectedRoute><SavedAddressesScreen /></ProtectedRoute>} />
                <Route path="/saved-labs" element={<ProtectedRoute><SavedLabsScreen /></ProtectedRoute>} />
                <Route path="/notifications" element={<ProtectedRoute><NotificationsScreen /></ProtectedRoute>} />
                <Route path="/subscription" element={<ProtectedRoute><SubscriptionScreen /></ProtectedRoute>} />
                <Route path="/doctor-consult" element={<ProtectedRoute><DoctorConsultScreen /></ProtectedRoute>} />
                <Route path="/upload-prescription" element={<ProtectedRoute><UploadPrescriptionScreen /></ProtectedRoute>} />
                <Route path="/family-members" element={<ProtectedRoute><FamilyMembersScreen /></ProtectedRoute>} />
                <Route path="/add-family-member" element={<ProtectedRoute><AddFamilyMemberScreen /></ProtectedRoute>} />

                <Route path="/partner-labs" element={<ProtectedRoute><PartnerLabsScreen /></ProtectedRoute>} />
                <Route path="/lab/:labId" element={<ProtectedRoute><LabDetailScreen /></ProtectedRoute>} />
                <Route path="/package/:packageId" element={<ProtectedRoute><PackageDetailScreen /></ProtectedRoute>} />
                <Route path="/packages" element={<ProtectedRoute><PackagesScreen /></ProtectedRoute>} />
                <Route path="/support" element={<ProtectedRoute><SupportScreen /></ProtectedRoute>} />
                <Route path="/support/ticket/:id" element={<ProtectedRoute><TicketDetailScreen /></ProtectedRoute>} />
                <Route path="/support/history" element={<ProtectedRoute><TicketHistoryScreen /></ProtectedRoute>} />

                <Route path="/physio-consult" element={<ProtectedRoute><PhysioConsultScreen /></ProtectedRoute>} />
                <Route path="/physio-booking" element={<Navigate replace to="/physio-consult" />} />
                <Route path="/ecg-test" element={<ProtectedRoute><ECGTestScreen /></ProtectedRoute>} />
                <Route path="/ecg-booking" element={<Navigate replace to="/ecg-test" />} />
                <Route path="/bp-check" element={<ProtectedRoute><BPCheckScreen /></ProtectedRoute>} />
                <Route path="/ecg-doctors" element={<ProtectedRoute><ECGDoctorsScreen /></ProtectedRoute>} />
                <Route path="/test-selection" element={<ProtectedRoute><TestSelectionScreen /></ProtectedRoute>} />
                <Route path="/consultation-call" element={<ProtectedRoute><ConsultationCallScreen /></ProtectedRoute>} />
                <Route path="/consultation-booking" element={<Navigate replace to="/doctor-consult" />} />
                <Route path="/call/:id" element={<ProtectedRoute><EmbeddedCallScreen /></ProtectedRoute>} />
                <Route path="/order-success" element={<ProtectedRoute><OrderSuccessScreen /></ProtectedRoute>} />
                <Route path="/tracking" element={<ProtectedRoute><TrackingScreen /></ProtectedRoute>} />
                <Route path="/tracking/:orderId" element={<ProtectedRoute><TrackingScreen /></ProtectedRoute>} />
                <Route path="/terms" element={<TermsScreen />} />
                <Route path="/policy/:id" element={<PolicyDetailScreen />} />
                <Route path="/privacy" element={<PrivacyPolicyScreen />} />
                <Route path="/data-attribution" element={<DataAttributionScreen />} />
                <Route path="/unauthorized" element={<UnauthorizedScreen />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </PageTransition>
        )}
      </AnimatePresence>
    </>
  );
};

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      // Avoid spamming toasts for 404s or canceled queries
      if (error.message && !error.message.includes("404")) {
        console.error("Query Error:", error);
      }
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      console.error("Mutation Error:", error);
      // We don't import toast directly here to avoid circular dependencies if any,
      // but since it's App.tsx, we can actually import it. We'll rely on the components
      // handling their own toasts, but this serves as a central logger.
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 min — avoid redundant refetches
      gcTime: 24 * 60 * 60 * 1000, // 24h — kept in localStorage persister so revisits hydrate instantly
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

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
        persistOptions={{
          persister,
          maxAge: 24 * 60 * 60 * 1000,
          buster: "v2-catalogue-memory-cache",
          dehydrateOptions: {
            // Large Admin catalogues remain in React Query's fast in-memory
            // cache. Serializing thousands of tests into localStorage blocks
            // mobile navigation and made Explore → Home visibly stutter.
            shouldDehydrateQuery: (query) =>
              typeof query.queryKey[0] !== "string" ||
              !query.queryKey[0].startsWith("bridge-tests"),
          },
        }}
      >
        <ThemeProvider>
          <AuthProvider>
            <NativeChrome />

            <CartProvider>
              <AddressProvider>
                <NotificationProvider>
                  <TooltipProvider>
                    <Toaster />
                    <Sonner />
                    <OfflineBanner />
                      <BrowserRouter>
                        <IncomingCallListener />
                        <DoctorAvailabilityListener />
                        <AppointmentStatusListener />
                        <CapacitorInitializer />
                        <CapacitorBackButton />
                        <ScrollToTop />
                        <BootReadySignal />
                        <RoutePrefetcher />
                        <DataWarmup />
                        <AnimatedRoutesWrapper />
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

const AnimatedRoutesWrapper = () => {
  return <AnimatedRoutes />;
};

export default App;
