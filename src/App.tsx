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
import { Suspense, lazy } from "react";

// Critical path — eagerly loaded (shown before auth)
import SplashScreen from "./pages/SplashScreen";
import OnboardingScreen from "./pages/OnboardingScreen";
import LoginScreen from "./pages/LoginScreen";

// All other screens — lazily loaded to reduce initial bundle
const LocationCheckScreen = lazy(() => import("./pages/LocationCheckScreen"));
const InstallScreen = lazy(() => import("./pages/InstallScreen"));
const HomeScreen = lazy(() => import("./pages/HomeScreen"));
const CategoriesScreen = lazy(() => import("./pages/CategoriesScreen"));
const CategoryTestsScreen = lazy(() => import("./pages/CategoryTestsScreen"));
const TestDetailScreen = lazy(() => import("./pages/TestDetailScreen"));
const TestSelectionScreen = lazy(() => import("./pages/TestSelectionScreen"));
const CartScreen = lazy(() => import("./pages/CartScreen"));
const LabSelectionScreen = lazy(() => import("./pages/LabSelectionScreen"));
const PaymentScreen = lazy(() => import("./pages/PaymentScreen"));
const BookingsScreen = lazy(() => import("./pages/BookingsScreen"));
const ReportsScreen = lazy(() => import("./pages/ReportsScreen"));
const ReportDetailScreen = lazy(() => import("./pages/ReportDetailScreen"));
const ProfileScreen = lazy(() => import("./pages/ProfileScreen"));
const EditProfileScreen = lazy(() => import("./pages/EditProfileScreen"));
const NotificationsScreen = lazy(() => import("./pages/NotificationsScreen"));
const SubscriptionScreen = lazy(() => import("./pages/SubscriptionScreen"));
const SavedAddressesScreen = lazy(() => import("./pages/SavedAddressesScreen"));
const DoctorConsultScreen = lazy(() => import("./pages/DoctorConsultScreen"));
const PartnerLabsScreen = lazy(() => import("./pages/PartnerLabsScreen"));
const LabDetailScreen = lazy(() => import("./pages/LabDetailScreen"));
const PackagesScreen = lazy(() => import("./pages/PackagesScreen"));
const PackageDetailScreen = lazy(() => import("./pages/PackageDetailScreen"));
const UploadPrescriptionScreen = lazy(() => import("./pages/UploadPrescriptionScreen"));
const SupportScreen = lazy(() => import("./pages/SupportScreen"));
const PhysioConsultScreen = lazy(() => import("./pages/PhysioConsultScreen"));
const PhysioBookingScreen = lazy(() => import("./pages/PhysioBookingScreen"));
const ECGTestScreen = lazy(() => import("./pages/ECGTestScreen"));
const ECGBookingScreen = lazy(() => import("./pages/ECGBookingScreen"));
const ConsultationCallScreen = lazy(() => import("./pages/ConsultationCallScreen"));
const ConsultationBookingScreen = lazy(() => import("./pages/ConsultationBookingScreen"));
const OrderSuccessScreen = lazy(() => import("./pages/OrderSuccessScreen"));
const TrackingScreen = lazy(() => import("./pages/TrackingScreen"));
const FamilyMembersScreen = lazy(() => import("./pages/FamilyMembersScreen"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <CartProvider>
          <AddressProvider>
            <NotificationProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <ScrollToTop />
                <Suspense fallback={null}>
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
                    
                    {/* Catch-all */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
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
);

export default App;
