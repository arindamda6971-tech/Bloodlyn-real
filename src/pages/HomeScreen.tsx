import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import BannerGraphic from "@/components/BannerGraphic";
import { useTestCatalogue, useTestSearchIndex } from "@/hooks/useTestCatalogue";
import { searchTests } from "@/lib/test-search";
import { formatCount, getTestDisplayName } from "@/lib/test-display";
import { useLabPicker } from "@/components/tests/useLabPicker";
import LabConflictDialog from "@/components/tests/LabConflictDialog";
import { useAuth } from "@/hooks/useAuth";
import { useDebounce } from "@/hooks/useDebounce";
import { AnimatePresence, motion } from "framer-motion";
import {
  Search,
  Bell,
  ChevronRight,
  Activity,
  X,
  Check,
  Plus,
  Phone,
  MessageCircle,
  ShieldCheck,
  Clock,
  Award,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import MobileLayout from "@/components/layout/MobileLayout";
import { supabase } from "@/integrations/supabase/client";
import { useNotifications } from "@/contexts/NotificationContext";
import { useRealtimeProducts } from "@/hooks/useRealtimeProducts";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import DiagnosticCentersCarousel from "@/components/home/DiagnosticCentersCarousel";
import HealthPackagesSection from "@/components/home/HealthPackagesSection";
import HealthConcernsGrid from "@/components/home/HealthConcernsGrid";
import HowItWorks from "@/components/home/HowItWorks";
import TakeChargeBanner from "@/components/home/TakeChargeBanner";
import { useUserPincode } from "@/hooks/useUserPincode";
import { useDiagnosticCenters } from "@/hooks/useDiagnosticCenters";
import { AdvancedSkeleton } from "@/components/ui/AdvancedSkeleton";
import LocationChip from "@/components/home/LocationChip";
import { useSEO } from "@/hooks/useSEO";
import { formatTestsLabel, splitTestNames } from "@/lib/format-tests";
import StickySearch from "@/components/ui/StickySearch";
import { ZomatoStyleHeader } from "@/components/layout/ZomatoStyleHeader";
import { PredictiveLink } from "@/components/ui/PredictiveLink";
import OptimizedImage from "@/components/ui/OptimizedImage";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";

const HOME_SEARCH_LIMIT = 20;

// Optimized greeting
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  if (hour >= 17 && hour < 21) return "Good evening";
  return "Good night";
};

// Service cards are full-bleed photos with a dark fade and white text, matching
// the "Full Body Health Checkup" banner. Photos are requested at 480px (cards are
// ~170px wide, so sharp at 2x+) to keep downloads small on mobile data.
const servicePhoto = (base: string) => `${base}?auto=format&fit=crop&w=480&h=440&q=70`;

const quickActions: {
  label: string;
  path: string;
  badge: string;
  price?: string;
  cta?: string;
  photo: string;
}[] = [
  { label: "Consult Doctor", path: "/doctor-consult", badge: "Live video", price: "From ₹299",
    photo: servicePhoto("https://images.unsplash.com/photo-1576091160399-112ba8d25d1d") },
  { label: "ECG Test", path: "/ecg-test", badge: "At home", price: "From ₹499",
    photo: servicePhoto("https://plus.unsplash.com/premium_photo-1718349374495-b1d09644f973") },
  { label: "BP Check", path: "/bp-check", badge: "Home visit", price: "From ₹199",
    photo: servicePhoto("https://plus.unsplash.com/premium_photo-1679502225906-85294c7ee8f2") },
  { label: "Physiotherapy", path: "/physio-consult", badge: "Expert care", price: "From ₹599",
    photo: servicePhoto("https://plus.unsplash.com/premium_photo-1661779394380-e372d6a1f198") },
  { label: "Upload Prescription", path: "/upload-prescription", badge: "We'll call you to book", cta: "Upload",
    photo: servicePhoto("https://plus.unsplash.com/premium_photo-1673953510197-0950d951c6d9") },
];


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
  const { addToCart, items, clearCart, replaceCart, hasItem } = useCart();
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 150);
  const [greeting, setGreeting] = useState(getGreeting());
  const [allTests, setAllTests] = useState<any[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showCallSheet, setShowCallSheet] = useState(false);

  // "Shop by health concern": run the Home search for that concern's tests and
  // bring the search bar (with its results) into view.
  const searchForConcern = useCallback((term: string) => {
    setSearchQuery(term);
    setShowSearchResults(true);
    const scroller = document.querySelector<HTMLElement>(".home-stack [data-scroll-container]");
    scroller?.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const { pincode: userPincode } = useUserPincode();
  const { data: centersData, isLoading: centersLoading } = useDiagnosticCenters(userPincode);

  const [currentTip] = useState(healthTips[Math.floor(Math.random() * healthTips.length)]);
  const diagnosticCenters = useMemo(() => {
    if (!centersData) return [];
    return centersData.slice(0, 8).map(center => ({
      id: center.id,
      name: center.name,
      rating: center.rating || 4.5,
      tests: center.reviews_count || 100,
      logo: center.logo_url || undefined,
    }));
  }, [centersData]);

  const StaticBackground = null;

  // Smart on-device search over the cached catalogue ("sugar" → glucose, HbA1c, GTT…).
  // Only the dropdown's first rows are shown; "See all" opens the full list in Explore.
  const { data: catalogue, isError: catalogueError } = useTestCatalogue();
  // Index only once the search is opened: Home itself never pays for it.
  const searchIndex = useTestSearchIndex(catalogue?.tests, showSearchResults || !!searchQuery);
  const search = useMemo(() => {
    const q = debouncedSearchQuery.trim();
    return q && searchIndex ? searchTests(searchIndex, q) : null;
  }, [debouncedSearchQuery, searchIndex]);
  const searchResults = useMemo(() => (search ? search.results.slice(0, HOME_SEARCH_LIMIT) : []), [search]);
  const searchPending = !!searchQuery.trim() && (!search || debouncedSearchQuery !== searchQuery) && !catalogueError;

  const isInCart = (testId: string, testName: string) => hasItem(testId, testName);

  // "+" opens the same "Select a Lab" sheet as the test page; a test never enters the
  // cart without a lab that offers it.
  const labPicker = useLabPicker();
  const handleQuickAdd = (e: React.MouseEvent, test: { id: string; name: string; price: number; category?: string }) => {
    e.stopPropagation();
    setShowSearchResults(false);
    labPicker.open(test);
  };

  const HighlightText = ({ text, highlight }: { text: string; highlight: string }) => {
    if (!highlight.trim()) return <span>{text}</span>;
    // Escape the query: a "(" or "+" typed in search must not throw an invalid-RegExp error.
    const escaped = highlight.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) => 
          part.toLowerCase() === highlight.toLowerCase() ? (
            <span key={i} className="text-primary font-black">{part}</span>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </span>
    );
  };

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

        {/* Sticky Search Input Bar - Pins at top-0 */}
        <StickySearch
          className="-mt-2"
          value={searchQuery}
          onChange={(v) => { setSearchQuery(v); setShowSearchResults(true); }}
          onFocus={() => setShowSearchResults(true)}
          placeholder="Search health tests..."
          results={
            showSearchResults && searchQuery.trim() ? (
              <div className="bg-card shadow-2xl shadow-black/10 rounded-2xl overflow-hidden max-h-[60vh] overflow-y-auto">
                {searchResults.length > 0 ? (
                  <div className="flex flex-col">
                    {search && search.concepts.length > 0 && (
                      <div className="flex items-center gap-1.5 px-4 pt-3 pb-1 text-[11.5px] font-semibold text-primary">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span className="truncate">Showing {search.concepts.slice(0, 2).join(" · ")} tests</span>
                      </div>
                    )}
                    {searchResults.map((test) => {
                      const testName = test.test_name || "Unknown Test";
                      const { title, specimen } = getTestDisplayName(test.display_name || testName);
                      const inCart = isInCart(test.id, testName);
                      return (
                        <div
                          key={test.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => {
                            navigate(`/test/${test.id}`, { state: { bridgeTest: test } });
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              navigate(`/test/${test.id}`, { state: { bridgeTest: test } });
                            }
                          }}
                          className="w-full text-left px-4 py-3 border-b border-border/40 last:border-0 hover:bg-muted/30 active:bg-muted/50 transition-colors flex justify-between items-center cursor-pointer"
                        >
                          <div className="flex-1 min-w-0 pr-3">
                            <p className="text-[13px] font-semibold text-foreground leading-tight truncate">
                              <HighlightText text={title} highlight={searchQuery} />
                            </p>
                            {specimen && (
                              <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{specimen}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                if (!inCart) {
                                  handleQuickAdd(e, {
                                    id: test.id,
                                    name: testName,
                                    price: test.price > 0 ? test.price : test.collection_fee || 0,
                                    category: test.category,
                                  });
                                }
                              }}
                              disabled={inCart}
                              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                                inCart
                                  ? "bg-success/10 text-success"
                                  : "bg-primary text-white shadow-md shadow-primary/20 active:scale-90"
                              }`}
                            >
                              {inCart ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    {search && search.results.length > searchResults.length && (
                      <button
                        type="button"
                        onClick={() =>
                          // Same history marker as the bottom bar, so Back / the Home tab return here.
                          navigate(`/categories?q=${encodeURIComponent(searchQuery.trim())}`, { state: { fromHomeTab: true } })
                        }
                        className="flex items-center justify-center gap-1 px-4 py-3 text-[13px] font-bold text-primary bg-primary/5 active:bg-primary/10"
                      >
                        See all {formatCount(search.results.length)} results
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ) : searchPending ? (
                  <div className="flex items-center gap-2 px-4 py-4 text-[13px] font-medium text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    Searching tests…
                  </div>
                ) : (
                  <div className="p-8 text-center flex flex-col items-center justify-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-muted/30 flex items-center justify-center">
                      <Search className="w-6 h-6 text-muted-foreground/50" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">No tests found</p>
                      <p className="text-xs font-medium text-muted-foreground mt-1">We couldn't find anything matching "{searchQuery}"</p>
                    </div>
                    <div className="flex gap-3 mt-2 w-full max-w-[200px]">
                      <Button variant="outline" size="sm" className="flex-1 rounded-xl h-10 border-border/50 bg-background hover:bg-muted/30" onClick={() => { setSearchQuery(""); setShowSearchResults(false); }}>
                        Clear Search
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : null
          }
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
          <div className="home-render-section mt-4" style={{ contain: "content" }}>
            <DiagnosticCentersCarousel centers={diagnosticCenters} />
          </div>
        )}

        {/* Our services — full photo cards (same style as the Full Body banner);
            Upload Prescription spans the full width */}
        <section className="px-4 mt-8" style={{ contain: "content" }}>
          <div className="mb-3">
            <h2 className="text-[19px] font-extrabold text-foreground tracking-tight">Our services</h2>
            <p className="text-[13px] text-muted-foreground mt-0.5">Care at home, booked in minutes</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action) => {
              const wide = !!action.cta;
              return (
                <button
                  type="button"
                  key={action.label}
                  onClick={() => navigate(action.path)}
                  onPointerDown={() => {
                    if (action.path === "/doctor-consult") import("../pages/DoctorConsultScreen");
                    else if (action.path === "/ecg-test") import("../pages/ECGTestScreen");
                    else if (action.path === "/bp-check") import("../pages/BPCheckScreen");
                  }}
                  className={`home-render-section relative overflow-hidden isolate text-left rounded-2xl bg-slate-800 shadow-card active:scale-[0.98] transition-transform duration-150 ${
                    wide ? "col-span-2 h-[96px]" : "h-[168px]"
                  }`}
                >
                  <OptimizedImage
                    src={action.photo}
                    alt=""
                    containerClassName="absolute inset-0 w-full h-full -z-10"
                    className="w-full h-full object-cover"
                  />
                  {/* Fade for readable white text */}
                  <span
                    aria-hidden="true"
                    className={`absolute inset-0 -z-10 ${
                      wide
                        ? "bg-gradient-to-r from-slate-950/90 via-slate-950/60 to-slate-950/10"
                        : "bg-gradient-to-t from-slate-950/90 via-slate-950/45 to-transparent"
                    }`}
                  />
                  <span
                    className={`absolute inset-0 flex p-3.5 ${
                      wide ? "items-center justify-between gap-3" : "flex-col justify-end"
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="inline-block text-[10px] font-bold text-white bg-white/15 ring-1 ring-white/25 rounded-full px-2 py-0.5 mb-1.5">
                        {action.badge}
                      </span>
                      <span className="block text-[16px] font-bold text-white leading-tight">{action.label}</span>
                      {action.price && (
                        <span className="mt-1 flex items-center gap-0.5 text-[12.5px] font-semibold text-white/80">
                          {action.price}
                          <ChevronRight className="w-3.5 h-3.5" strokeWidth={2.5} />
                        </span>
                      )}
                    </span>
                    {action.cta && (
                      <span className="flex items-center gap-0.5 text-[13px] font-bold text-foreground bg-white rounded-full pl-3.5 pr-2.5 py-2 shadow-md shrink-0">
                        {action.cta}
                        <ChevronRight className="w-4 h-4" strokeWidth={2.5} />
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

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

      {labPicker.sheet}
      <LabConflictDialog />
      </MobileLayout>
  );
};

export default HomeScreen;
