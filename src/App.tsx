import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryCache, MutationCache } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";

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
import OfflineBanner from "@/components/OfflineBanner";
import PerformanceMonitor from "@/components/PerformanceMonitor";
import DataWarmup from "@/components/DataWarmup";
import NativeChrome from "@/components/NativeChrome";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAppLifecycle } from "@/hooks/useAppLifecycle";
import { IncomingCallListener } from "@/components/IncomingCallListener";
import DoctorAvailabilityListener from "@/components/DoctorAvailabilityListener";
import AppointmentStatusListener from "@/components/AppointmentStatusListener";
import { useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";

// Screens are now lazy loaded to reduce JS bundle size and main thread blocking
import { lazy, Suspense } from "react";

const SplashScreen = lazy(() => import("./pages/SplashScreen"));
const OnboardingScreen = lazy(() => import("./pages/OnboardingScreen"));
const LoginScreen = lazy(() => import("./pages/LoginScreen"));
const HomeScreen = lazy(() => import("./pages/HomeScreen"));
const CategoriesScreen = lazy(() => import("./pages/CategoriesScreen"));
const ProfileScreen = lazy(() => import("./pages/ProfileScreen"));
const BookingsScreen = lazy(() => import("./pages/BookingsScreen"));
const LocationCheckScreen = lazy(() => import("./pages/LocationCheckScreen"));
const TestDetailScreen = lazy(() => import("./pages/TestDetailScreen"));
const CartScreen = lazy(() => import("./pages/CartScreen"));
const InstallScreen = lazy(() => import("./pages/InstallScreen"));
const CategoryTestsScreen = lazy(() => import("./pages/CategoryTestsScreen"));
const TestSelectionScreen = lazy(() => import("./pages/TestSelectionScreen"));
const LabSelectionScreen = lazy(() => import("./pages/LabSelectionScreen"));
const PaymentScreen = lazy(() => import("./pages/PaymentScreen"));
const ReportsScreen = lazy(() => import("./pages/ReportsScreen"));
const ReportDetailScreen = lazy(() => import("./pages/ReportDetailScreen"));
const EditProfileScreen = lazy(() => import("./pages/EditProfileScreen"));
const NotificationsScreen = lazy(() => import("./pages/NotificationsScreen"));
const SubscriptionScreen = lazy(() => import("./pages/SubscriptionScreen"));
const SavedAddressesScreen = lazy(() => import("./pages/SavedAddressesScreen"));
const DoctorConsultScreen = lazy(() => import("./pages/DoctorConsultScreen"));
const PartnerLabsScreen = lazy(() => import("./pages/PartnerLabsScreen"));
const LabDetailScreen = lazy(() => import("./pages/LabDetailScreen"));
const PackagesScreen = lazy(() => import("./pages/PackagesScreen"));
const PackageDetailScreen = lazy(() => import("./pages/PackageDetailScreen"));
const SupportScreen = lazy(() => import("./pages/SupportScreen"));
const PhysioConsultScreen = lazy(() => import("./pages/PhysioConsultScreen"));
const ECGTestScreen = lazy(() => import("./pages/ECGTestScreen"));
const BPCheckScreen = lazy(() => import("./pages/BPCheckScreen"));
const ConsultationCallScreen = lazy(() => import("./pages/ConsultationCallScreen"));
const EmbeddedCallScreen = lazy(() => import("./pages/EmbeddedCallScreen"));
const OrderSuccessScreen = lazy(() => import("./pages/OrderSuccessScreen"));
const TrackingScreen = lazy(() => import("./pages/TrackingScreen"));
const FamilyMembersScreen = lazy(() => import("./pages/FamilyMembersScreen"));
const AddFamilyMemberScreen = lazy(() => import("./pages/AddFamilyMemberScreen"));
const PaymentMethodsScreen = lazy(() => import("./pages/PaymentMethodsScreen"));
const TermsScreen = lazy(() => import("./pages/TermsScreen"));
const PrivacyPolicyScreen = lazy(() => import("./pages/PrivacyPolicyScreen"));
const ECGDoctorsScreen = lazy(() => import("./pages/ECGDoctorsScreen"));
const NotFound = lazy(() => import("./pages/NotFound"));
const UnauthorizedScreen = lazy(() => import("./pages/UnauthorizedScreen"));
const UploadPrescriptionScreen = lazy(() => import("./pages/UploadPrescriptionScreen"));

const CapacitorInitializer = () => {
  useEffect(() => {
    // Initializer logic can go here if needed
  }, []);
  return null;
};

/**
 * High-Performance Native Stack Navigator.
 * Uses SmoothRoutes to defer the actual route swap until the next chunk is ready,
 * and PageTransition to handle the physical "Native-Feel" animation.
 */
const AnimatedRoutes = () => {
  const location = useLocation();
  
  return (
    <AnimatePresence initial={false}>
      <PageTransition location={location} key={location.pathname}>
        <Suspense fallback={<div className="min-h-screen bg-background" />}>
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
        </AnimatePresence>
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
  return <AnimatedRoutes />;
};

export default App;
