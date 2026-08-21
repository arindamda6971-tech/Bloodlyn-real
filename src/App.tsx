import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";

import { AuthProvider } from "@/hooks/useAuth";
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
import SmoothRoutes from "@/components/SmoothRoutes";
import OfflineBanner from "@/components/OfflineBanner";
import PerformanceMonitor from "@/components/PerformanceMonitor";
import DataWarmup from "@/components/DataWarmup";
import NativeChrome from "@/components/NativeChrome";
import { Suspense, lazy, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useAppLifecycle } from "@/hooks/useAppLifecycle";
import { IncomingCallListener } from "@/components/IncomingCallListener";
import DoctorAvailabilityListener from "@/components/DoctorAvailabilityListener";
import AppointmentStatusListener from "@/components/AppointmentStatusListener";
import { useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";

// Core screens — eagerly loaded for instant navigation (no chunk-load delay)
import SplashScreen from "./pages/SplashScreen";
import OnboardingScreen from "./pages/OnboardingScreen";
import LoginScreen from "./pages/LoginScreen";
import HomeScreen from "./pages/HomeScreen";
import CategoriesScreen from "./pages/CategoriesScreen";
import ProfileScreen from "./pages/ProfileScreen";
import BookingsScreen from "./pages/BookingsScreen";
import LocationCheckScreen from "./pages/LocationCheckScreen";
import TestDetailScreen from "./pages/TestDetailScreen";
import CartScreen from "./pages/CartScreen";

// All other screens — lazily loaded with auto-reload fallback
const safeImport = <T,>(importFn: () => Promise<T>): Promise<T> => {
  return importFn().catch((error) => {
    console.error("Critical: Failed to load module. Auto-reloading...", error);
    if (typeof window !== "undefined") {
      window.location.reload();
    }
    throw error;
  });
};

const CapacitorInitializer = () => {
  useEffect(() => {
    // Initializer logic can go here if needed
  }, []);
  return null;
};

const InstallScreen = lazy(() => safeImport(() => import("./pages/InstallScreen")));
const CategoryTestsScreen = lazy(() => safeImport(() => import("./pages/CategoryTestsScreen")));
const TestSelectionScreen = lazy(() => safeImport(() => import("./pages/TestSelectionScreen")));
const LabSelectionScreen = lazy(() => safeImport(() => import("./pages/LabSelectionScreen")));
const PaymentScreen = lazy(() => safeImport(() => import("./pages/PaymentScreen")));
const ReportsScreen = lazy(() => safeImport(() => import("./pages/ReportsScreen")));
const ReportDetailScreen = lazy(() => safeImport(() => import("./pages/ReportDetailScreen")));
const EditProfileScreen = lazy(() => safeImport(() => import("./pages/EditProfileScreen")));
const NotificationsScreen = lazy(() => safeImport(() => import("./pages/NotificationsScreen")));
const SubscriptionScreen = lazy(() => safeImport(() => import("./pages/SubscriptionScreen")));
const SavedAddressesScreen = lazy(() => safeImport(() => import("./pages/SavedAddressesScreen")));
const DoctorConsultScreen = lazy(() => safeImport(() => import("./pages/DoctorConsultScreen")));
const PartnerLabsScreen = lazy(() => safeImport(() => import("./pages/PartnerLabsScreen")));
const LabDetailScreen = lazy(() => safeImport(() => import("./pages/LabDetailScreen")));
const PackagesScreen = lazy(() => safeImport(() => import("./pages/PackagesScreen")));
const PackageDetailScreen = lazy(() => safeImport(() => import("./pages/PackageDetailScreen")));
const SupportScreen = lazy(() => safeImport(() => import("./pages/SupportScreen")));
const PhysioConsultScreen = lazy(() => safeImport(() => import("./pages/PhysioConsultScreen")));
const ECGTestScreen = lazy(() => safeImport(() => import("./pages/ECGTestScreen")));
const BPCheckScreen = lazy(() => safeImport(() => import("./pages/BPCheckScreen")));
const ConsultationCallScreen = lazy(() => safeImport(() => import("./pages/ConsultationCallScreen")));
const EmbeddedCallScreen = lazy(() => safeImport(() => import("./pages/EmbeddedCallScreen")));
const OrderSuccessScreen = lazy(() => safeImport(() => import("./pages/OrderSuccessScreen")));
const TrackingScreen = lazy(() => safeImport(() => import("./pages/TrackingScreen")));
const FamilyMembersScreen = lazy(() => safeImport(() => import("./pages/FamilyMembersScreen")));
const AddFamilyMemberScreen = lazy(() => safeImport(() => import("./pages/AddFamilyMemberScreen")));
const PaymentMethodsScreen = lazy(() => safeImport(() => import("./pages/PaymentMethodsScreen")));
const TermsScreen = lazy(() => safeImport(() => import("./pages/TermsScreen")));
const PrivacyPolicyScreen = lazy(() => safeImport(() => import("./pages/PrivacyPolicyScreen")));
const ECGDoctorsScreen = lazy(() => safeImport(() => import("./pages/ECGDoctorsScreen")));
const NotFound = lazy(() => safeImport(() => import("./pages/NotFound")));
const UnauthorizedScreen = lazy(() => safeImport(() => import("./pages/UnauthorizedScreen")));
const UploadPrescriptionScreen = lazy(() => safeImport(() => import("./pages/UploadPrescriptionScreen")));

/**
 * High-Performance Native Stack Navigator.
 */
const AnimatedRoutes = ({ location }: { location: any }) => {
  return (
    <PageTransition location={location}>
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
          <Route path="/upload-prescription" element={<ProtectedRoute><UploadPrescriptionScreen /></ProtectedRoute>} />
          <Route path="/family-members" element={<ProtectedRoute><FamilyMembersScreen /></ProtectedRoute>} />
          <Route path="/add-family-member" element={<ProtectedRoute><AddFamilyMemberScreen /></ProtectedRoute>} />
          <Route path="/payment-methods" element={<ProtectedRoute><PaymentMethodsScreen /></ProtectedRoute>} />
          <Route path="/partner-labs" element={<ProtectedRoute><PartnerLabsScreen /></ProtectedRoute>} />
          <Route path="/lab/:labId" element={<ProtectedRoute><LabDetailScreen /></ProtectedRoute>} />
          <Route path="/package/:packageId" element={<ProtectedRoute><PackageDetailScreen /></ProtectedRoute>} />
          <Route path="/packages" element={<ProtectedRoute><PackagesScreen /></ProtectedRoute>} />
          <Route path="/support" element={<ProtectedRoute><SupportScreen /></ProtectedRoute>} />
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
          <Route path="/privacy" element={<PrivacyPolicyScreen />} />
          <Route path="/unauthorized" element={<UnauthorizedScreen />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </PageTransition>
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
            <NativeChrome />

            <CartProvider>
              <AddressProvider>
                <NotificationProvider>
                  <TooltipProvider>
                    <Toaster />
                    <Sonner />
                    <OfflineBanner />
                    <PerformanceMonitor />
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
  const navigate = useNavigate();

  // Native Edge-Swipe Back Gesture
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let startX = 0;
    let startY = 0;

    const onTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };

    const onTouchEnd = (e: TouchEvent) => {
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;

      const diffX = endX - startX;
      const diffY = Math.abs(endY - startY);

      // If swipe started from left edge (first 30px) and moved right
      if (startX < 30 && diffX > 100 && diffY < 50) {
        navigate(-1);
      }
    };

    document.addEventListener("touchstart", onTouchStart);
    document.addEventListener("touchend", onTouchEnd);
    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, [navigate]);

  return (
    <SmoothRoutes>
      {(loc) => <AnimatedRoutes location={loc} />}
    </SmoothRoutes>
  );
};

export default App;
