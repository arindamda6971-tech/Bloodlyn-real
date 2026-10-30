import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import BannerGraphic from "@/components/BannerGraphic";
import { useAuth } from "@/hooks/useAuth";
import { AnimatePresence, motion } from "framer-motion";
import {
  Search,
  Bell,
  ChevronRight,
  Activity,
  Phone,
  MessageCircle,
  ShieldCheck,
  Clock,
  Award,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import MobileLayout from "@/components/layout/MobileLayout";
import { supabase } from "@/integrations/supabase/client";
import { useNotifications } from "@/contexts/NotificationContext";
import { useRealtimeProducts } from "@/hooks/useRealtimeProducts";
import { useCart } from "@/contexts/CartContext";
import DiagnosticCentersCarousel from "@/components/home/DiagnosticCentersCarousel";
import HealthPackagesSection from "@/components/home/HealthPackagesSection";
import HealthConcernsGrid from "@/components/home/HealthConcernsGrid";
import HowItWorks from "@/components/home/HowItWorks";
import OurServices from "@/components/home/OurServices";
import TakeChargeBanner from "@/components/home/TakeChargeBanner";
import { useUserPincode } from "@/hooks/useUserPincode";
import { useDiagnosticCenters } from "@/hooks/useDiagnosticCenters";
import { AdvancedSkeleton } from "@/components/ui/AdvancedSkeleton";
import LocationChip from "@/components/home/LocationChip";
import { useSEO } from "@/hooks/useSEO";
import { formatTestsLabel, splitTestNames } from "@/lib/format-tests";
import StickySearch from "@/components/ui/StickySearch";
import { SearchScreen, useSearchMode } from "@/components/search/SearchScreen";
import { ZomatoStyleHeader } from "@/components/layout/ZomatoStyleHeader";
import { PredictiveLink } from "@/components/ui/PredictiveLink";
import OptimizedImage from "@/components/ui/OptimizedImage";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";

// Optimized greeting
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  if (hour >= 17 && hour < 21) return "Good evening";
  return "Good night";
};




const healthTips = [
  "Drinking water before a blood test makes the process easier for the technician.",
  "Fasting for 8-12 hours is usually required for a Lipid Profile test.",
  "Regular full-body checkups can detect issues before they become serious.",
  "Your HbA1c level gives a 3-month average of your blood sugar levels.",
];

type PreviousOrder = {
  id: string;
  order_number: string | null;
  test_name: string | null;
  total: number;
  status: string | null;
  created_at: string;
};

const HomeScreen = () => {
  useSEO({ title: "BloodLyn — Book Health Tests at Home", description: "Book NABL-certified home health tests in 60 minutes." });
  const navigate = useNavigate();
  const carouselRef = useRef<HTMLDivElement>(null);
  const { unreadCount } = useNotifications();
  const { user } = useAuth();
  const { items, clearCart, replaceCart } = useCart();
  const [searchQuery, setSearchQuery] = useState("");
  const [greeting, setGreeting] = useState(getGreeting());
  const [allTests, setAllTests] = useState<any[]>([]);
  const [showCallSheet, setShowCallSheet] = useState(false);

  // Full-screen search (shared with Explore Tests): Back closes it, a result opens its test.
  const { open: searchOpen, openSearch, closeSearch, openTest } = useSearchMode();

  // "Shop by health concern": run the search for that concern's tests.
  const searchForConcern = useCallback((term: string) => {
    const scroller = document.querySelector<HTMLElement>(".home-stack [data-scroll-container]");
    scroller?.scrollTo({ top: 0 });
    setSearchQuery(term);
    openSearch();
  }, [openSearch]);

  const { pincode: userPincode } = useUserPincode();
  const { data: centersData, isLoading: centersLoading } = useDiagnosticCenters(userPincode);

  const [currentTip] = useState(healthTips[Math.floor(Math.random() * healthTips.length)]);
  const diagnosticCenters = useMemo(() => {
    if (!centersData) return [];
    return centersData.slice(0, 8).map(center => ({
      id: center.id,
      name: center.name,
      // Only real data: no default rating, review count or test count.
      rating: center.rating ?? null,
      reviews: center.reviews_count ?? 0,
      testCount: Array.isArray(center.available_tests) ? center.available_tests.length : 0,
      city: center.city ?? null,
      isVerified: !!center.is_verified,
      homeCollection: !!center.home_collection_available,
      isActive: center.is_active ?? undefined,
      vendorId: center.vendor_id ?? null,
      logo: center.logo_url || undefined,
    }));
  }, [centersData]);

  const StaticBackground = null;



  return (
    <MobileLayout>
      {StaticBackground}
        {/* Zomato / Swiggy Style Top Header - Scrolls away naturally */}
        <div className="px-5 pb-0">
          <ZomatoStyleHeader
            unreadCount={unreadCount}
            onOpenCall={() => setShowCallSheet(true)}
            greeting={greeting}
            activeBookingsCount={8}
          />
        </div>

        <SearchScreen
          open={searchOpen}
          query={searchQuery}
          onQueryChange={setSearchQuery}
          onClose={closeSearch}
          onOpenTest={openTest}
        />

        {/* Sticky Search Input Bar - Pins at top-0 (tapping it opens the search screen) */}
        <StickySearch
          className="-mt-2"
          value={searchQuery}
          onChange={(v) => { setSearchQuery(v); if (!searchOpen) openSearch(); }}
          onFocus={() => { if (!searchOpen) openSearch(); }}
          placeholder="Search health tests..."
        />

        <TakeChargeBanner />

        {/* Trust & Quality Assurance Bar (Static, Zero-Lag, Seamless Pure White Card) */}
        <div className="px-4 mt-3">
          <div className="grid grid-cols-3 gap-1 py-3 px-1.5 rounded-2xl bg-white shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
            <div className="flex flex-col items-center text-center px-1">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-1 shadow-sm">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <p className="text-[11px] sm:text-[11.5px] font-bold text-slate-800 leading-tight truncate max-w-full">100% NABL</p>
              <p className="text-[9.5px] sm:text-[10px] text-slate-500 font-medium mt-0.5 leading-tight truncate max-w-full">Certified Labs</p>
            </div>

            <div className="flex flex-col items-center text-center border-x border-slate-100/70 px-1">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-1 shadow-sm">
                <Clock className="w-4 h-4" />
              </div>
              <p className="text-[11px] sm:text-[11.5px] font-bold text-slate-800 leading-tight truncate max-w-full">Home Pickup</p>
              <p className="text-[9.5px] sm:text-[10px] text-slate-500 font-medium mt-0.5 leading-tight truncate max-w-full">Safe & On-Time</p>
            </div>

            <div className="flex flex-col items-center text-center px-1">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-1 shadow-sm">
                <Award className="w-4 h-4" />
              </div>
              <p className="text-[11px] sm:text-[11.5px] font-bold text-slate-800 leading-tight truncate max-w-full">Fast Reports</p>
              <p className="text-[9.5px] sm:text-[10px] text-slate-500 font-medium mt-0.5 leading-tight truncate max-w-full">Digital in 6-24h</p>
            </div>
          </div>
        </div>

        {/* Diagnostic Centers */}
        {centersLoading ? (
          <div className="px-4 mt-6">
            <AdvancedSkeleton type="lab-card" count={2} />
          </div>
        ) : diagnosticCenters.length > 0 && (
          <div className="home-render-section mt-6" style={{ contain: "content" }}>
            <DiagnosticCentersCarousel centers={diagnosticCenters} />
          </div>
        )}

        {/* Our services — light tiles with soft-3D illustrations */}
        <OurServices />

        <HealthConcernsGrid onSelect={searchForConcern} />

        {/* Health Packages (real-time, vendor-driven) */}
        <HealthPackagesSection />

        <HowItWorks />

        {/* Doctor Banner */}
        <section className="home-render-section px-4 mt-8 mb-8">
          <button onClick={() => navigate('/categories')} className="w-full relative overflow-hidden isolate rounded-3xl group active:scale-[0.98] transition-transform shadow-xl shadow-black/5 h-[200px]">
            
            {/* Background Image */}
            <OptimizedImage
              src="https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&q=80&w=800" 
              alt="Health Checkup"
              containerClassName="absolute inset-0 w-full h-full z-0"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />

            {/* Gradient Overlays for Readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/40 to-transparent z-0" />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-900/30 to-transparent z-0" />

            {/* Content */}
            <div className="absolute inset-0 p-5 flex flex-col justify-between z-10 text-left">
              <div className="flex flex-col items-start pt-2">
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                  <p className="text-blue-300 text-[10px] font-black uppercase tracking-widest">Doctor Recommended</p>
                </div>
                <h3 className="text-white text-[24px] font-black leading-tight tracking-tight drop-shadow-md">
                  Full Body Health<br/>Checkup Today
                </h3>
              </div>
              <div className="flex items-end pb-1 justify-between w-full">
                <p className="text-slate-300 text-[11px] font-semibold max-w-[120px] leading-tight">Comprehensive blood analysis & review</p>
                <span className="bg-white/10 text-white border border-white/20 text-sm font-black px-5 py-2.5 rounded-full shadow-lg flex items-center gap-2 group-hover:bg-white/20 transition-colors">
                  Book Now <ChevronRight className="w-4 h-4" />
                </span>
              </div>
            </div>
          </button>
        </section>

      {/* Contact Bottom Sheet - using native-feel Drawer */}
      <Drawer open={showCallSheet} onOpenChange={setShowCallSheet}>
        <DrawerContent className="px-6 pb-10 bg-background/98 border-border/80 rounded-t-[2.5rem]">
          <DrawerHeader className="px-0 pt-6 text-left">
            <DrawerTitle className="text-xl font-black text-foreground mb-4">Contact BloodLyn</DrawerTitle>
            <DrawerDescription className="sr-only">Choose a method to contact our support team</DrawerDescription>
          </DrawerHeader>

          <div className="space-y-3">
            <a href="tel:+919883143033" className="flex items-center gap-4 p-5 bg-primary/5 rounded-[2rem] active:scale-95 transition-transform border border-primary/10">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center"><Phone className="w-5 h-5 text-primary" /></div>
              <div><p className="font-bold text-foreground">Voice Call</p><p className="text-xs text-muted-foreground">+91 9883143033</p></div>
            </a>
            <a href="https://wa.me/919883143033" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-5 bg-success/5 rounded-[2rem] active:scale-95 transition-transform border border-success/10">
              <div className="w-12 h-12 rounded-2xl bg-success/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-success" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </div>
              <div><p className="font-bold text-foreground">WhatsApp</p><p className="text-xs text-muted-foreground">Quick Support</p></div>
            </a>
          </div>
        </DrawerContent>
      </Drawer>



      </MobileLayout>
  );
};

export default HomeScreen;
