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

// All screens — eagerly loaded for instant 0ms navigation without blank/white flashes
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
import InstallScreen from "./pages/InstallScreen";
import CategoryTestsScreen from "./pages/CategoryTestsScreen";
import TestSelectionScreen from "./pages/TestSelectionScreen";
import LabSelectionScreen from "./pages/LabSelectionScreen";
import PaymentScreen from "./pages/PaymentScreen";
import ReportsScreen from "./pages/ReportsScreen";
import ReportDetailScreen from "./pages/ReportDetailScreen";
import EditProfileScreen from "./pages/EditProfileScreen";
import NotificationsScreen from "./pages/NotificationsScreen";
import SubscriptionScreen from "./pages/SubscriptionScreen";
import SavedAddressesScreen from "./pages/SavedAddressesScreen";
import DoctorConsultScreen from "./pages/DoctorConsultScreen";
import PartnerLabsScreen from "./pages/PartnerLabsScreen";
import LabDetailScreen from "./pages/LabDetailScreen";
import PackagesScreen from "./pages/PackagesScreen";
import PackageDetailScreen from "./pages/PackageDetailScreen";
import SupportScreen from "./pages/SupportScreen";
import PhysioConsultScreen from "./pages/PhysioConsultScreen";
import ECGTestScreen from "./pages/ECGTestScreen";
import BPCheckScreen from "./pages/BPCheckScreen";
import ConsultationCallScreen from "./pages/ConsultationCallScreen";
import EmbeddedCallScreen from "./pages/EmbeddedCallScreen";
import OrderSuccessScreen from "./pages/OrderSuccessScreen";
import TrackingScreen from "./pages/TrackingScreen";
import FamilyMembersScreen from "./pages/FamilyMembersScreen";
import AddFamilyMemberScreen from "./pages/AddFamilyMemberScreen";
import PaymentMethodsScreen from "./pages/PaymentMethodsScreen";
import TermsScreen from "./pages/TermsScreen";
import PrivacyPolicyScreen from "./pages/PrivacyPolicyScreen";
import ECGDoctorsScreen from "./pages/ECGDoctorsScreen";
import NotFound from "./pages/NotFound";
import UnauthorizedScreen from "./pages/UnauthorizedScreen";
import UploadPrescriptionScreen from "./pages/UploadPrescriptionScreen";

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
