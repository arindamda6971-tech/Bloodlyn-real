import { useEffect } from "react";

/**
 * RoutePrefetcher component.
 * Silently pre-downloads ALL Javascript chunks for every screen in the
 * background on idle. Once a chunk is preloaded, React.lazy resolves
 * synchronously and Suspense never flashes its fallback.
 */
const RoutePrefetcher = () => {
  useEffect(() => {
    const prefetchRoutes = () => {
      // Core navigation tabs (highest priority)
      import("../pages/HomeScreen");
      import("../pages/CategoriesScreen");
      import("../pages/BookingsScreen");
      import("../pages/ReportsScreen");
      import("../pages/ProfileScreen");

      // Most visited flows
      import("../pages/CartScreen");
      import("../pages/CategoryTestsScreen");
      import("../pages/TestDetailScreen");
      import("../pages/LabSelectionScreen");
      import("../pages/ECGDoctorsScreen");
    };

    const prefetchRemaining = () => {
      // Everything else — loaded on second idle callback so we don't
      // block the main thread during initial interaction.
      import("../pages/SplashScreen");
      import("../pages/OnboardingScreen");
      import("../pages/LoginScreen");
      import("../pages/InstallScreen");
      import("../pages/TestSelectionScreen");
      import("../pages/PaymentScreen");
      import("../pages/PaymentProcessingScreen");
      import("../pages/ReportDetailScreen");
      import("../pages/EditProfileScreen");
      import("../pages/NotificationsScreen");
      import("../pages/SubscriptionScreen");
      import("../pages/SavedAddressesScreen");
      import("../pages/SavedLabsScreen");
      import("../pages/DoctorConsultScreen");
      import("../pages/PartnerLabsScreen");
      import("../pages/LabDetailScreen");
      import("../pages/PackagesScreen");
      import("../pages/PackageDetailScreen");
      import("../pages/SupportScreen");
      import("../pages/PhysioConsultScreen");
      import("../pages/ECGTestScreen");
      import("../pages/BPCheckScreen");
      import("../pages/ConsultationCallScreen");
      import("../pages/EmbeddedCallScreen");
      import("../pages/OrderSuccessScreen");
      import("../pages/TrackingScreen");
      import("../pages/FamilyMembersScreen");
      import("../pages/AddFamilyMemberScreen");
      import("../pages/PaymentMethodsScreen");
      import("../pages/TermsScreen");
      import("../pages/PrivacyPolicyScreen");
      import("../pages/NotFound");
      import("../pages/UnauthorizedScreen");
      import("../pages/UploadPrescriptionScreen");
    };

    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(() => {
        prefetchRoutes();
        // Second batch after a short delay
        (window as any).requestIdleCallback(prefetchRemaining, { timeout: 4000 });
      }, { timeout: 2000 });
    } else {
      // Fallback for Safari
      setTimeout(prefetchRoutes, 2000);
      setTimeout(prefetchRemaining, 4000);
    }
  }, []);

  return null;
};

export default RoutePrefetcher;
