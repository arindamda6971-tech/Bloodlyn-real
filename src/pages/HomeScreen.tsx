import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import BannerGraphic from "@/components/BannerGraphic";
import { useBridgeTests } from "@/hooks/useBridgeTests";
import { useAuth } from "@/hooks/useAuth";
import { useDebounce } from "@/hooks/useDebounce";
import { AnimatePresence, motion } from "framer-motion";
import {
  Search,
  Bell,
  ChevronRight,
  HeartPulse,
  Activity,
  X,
  Check,
  FileUp,
  Stethoscope,
  Plus,
  Phone,
  MessageCircle,
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
import TakeChargeBanner from "@/components/home/TakeChargeBanner";
import { useUserPincode } from "@/hooks/useUserPincode";
import { useDiagnosticCenters } from "@/hooks/useDiagnosticCenters";
import { AdvancedSkeleton } from "@/components/ui/AdvancedSkeleton";
import { intelligentSearch } from "@/utils/search-intelligence";
import { matchToDictionary } from "@/lib/medical-dictionary";
import { simplifyTestName } from "@/utils/simplify-test-name";
import LocationChip from "@/components/home/LocationChip";
import { useSEO } from "@/hooks/useSEO";
import { formatTestsLabel, splitTestNames } from "@/lib/format-tests";
import StickySearch from "@/components/ui/StickySearch";
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

const quickActions = [
  { 
    icon: Stethoscope, 
    label: "Consult Doctor", 
    path: "/doctor-consult", 
    badge: "Live Video",
    desc: "Connect with specialized doctors instantly via secure video call.",
    price: "Starts at ₹299",
    gradient: "from-[#10b981] to-[#0d9488]",
    glow: "bg-[#10b981]/20",
    badgeColor: "bg-[#ecfdf5] text-[#059669] border-[#d1fae5]",
    bgImage: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format,webp&q=80&w=800"
  },
  { 
    icon: HeartPulse, 
    label: "ECG Test", 
    path: "/ecg-test", 
    badge: "At Home",
    desc: "Clinical-grade resting ECG test performed by certified technicians.",
    price: "Starts at ₹499",
    gradient: "from-[#f43f5e] to-[#dc2626]",
    glow: "bg-[#f43f5e]/20",
    badgeColor: "bg-[#fff1f2] text-[#e11d48] border-[#ffe4e6]",
    bgImage: "https://plus.unsplash.com/premium_photo-1718349374495-b1d09644f973?auto=format,webp&w=800&q=80"
  },
  {
    icon: HeartPulse,
    label: "BP Check",
    path: "/bp-check",
    badge: "Home Visit",
    desc: "Book a trained professional to measure your blood pressure accurately.",
    price: "Starts at ₹199",
    gradient: "from-[#f43f5e] to-[#3b82f6]",
    glow: "bg-[#3b82f6]/20",
    badgeColor: "bg-[#eff6ff] text-[#2563eb] border-[#dbeafe]",
    bgImage: "https://plus.unsplash.com/premium_photo-1679502225906-85294c7ee8f2?auto=format,webp&w=800&q=80"
  },
  { 
    icon: Activity, 
    label: "Consult Physiotherapist", 
    path: "/physio-consult", 
    badge: "Expert Care",
    desc: "Personalized physiotherapy sessions at your doorstep for fast recovery.",
    price: "Starts at ₹599",
    gradient: "from-[#6366f1] to-[#2563eb]",
    glow: "bg-[#6366f1]/20",
    badgeColor: "bg-[#eef2ff] text-[#4f46e5] border-[#e0e7ff]",
    bgImage: "https://plus.unsplash.com/premium_photo-1661779394380-e372d6a1f198?auto=format,webp&w=800&q=80"
  },
  { 
    icon: FileUp, 
    label: "Upload Prescription", 
    path: "/upload-prescription", 
    badge: "Get a Call",
    desc: "Simply upload your prescription and our experts will call you to arrange the tests.",
    cta: "Take a Photo",
    gradient: "from-[#f59e0b] to-[#d97706]",
    glow: "bg-[#f59e0b]/20",
    badgeColor: "bg-[#fef3c7] text-[#b45309] border-[#fde68a]",
    bgImage: "https://plus.unsplash.com/premium_photo-1673953510197-0950d951c6d9?auto=format,webp&w=800&q=80"
  },
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
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [greeting, setGreeting] = useState(getGreeting());
  const [allTests, setAllTests] = useState<any[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showCallSheet, setShowCallSheet] = useState(false);

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

  const StaticBackground = useMemo(() => (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      <div className="absolute top-0 left-0 w-full h-[800px] bg-gradient-to-b from-primary/5 via-primary/5 to-transparent" />
      <div className="absolute top-[-50px] left-[-50px] w-80 h-80 rounded-full" style={{ background: "radial-gradient(circle, hsl(var(--primary) / 0.1) 0%, transparent 70%)" }} />
    </div>
  ), []);

  // Compute the intelligent search term (dictionary-mapped)
  const backendSearchTerm = useMemo(() => {
    const q = debouncedSearchQuery.trim();
    if (!q) return "";

    const dictMatch = matchToDictionary(q, 0.5);
    if (dictMatch) {
      const canonical = dictMatch.canonical.toLowerCase();
      
      // Extract the most significant scientific keyword from the canonical name
      const stopWords = ["test", "profile", "function", "serum", "blood", "count", "rate", "acid"];
      const words = canonical.split(" ").filter(w => !stopWords.includes(w) && w.length > 2);
      
      if (words.includes("glucose") || words.includes("sugar") || words.includes("hba1c")) return "glucose";
      if (words.includes("lipid") || words.includes("cholesterol")) return "cholesterol";
      if (words.includes("thyroid") || words.includes("tsh")) return "thyroid";
      
      return words[0] || dictMatch.canonical.split(" ")[0]; 
    }
    return "";
  }, [debouncedSearchQuery]);

  const rawQuery = debouncedSearchQuery.trim();

  // Query 1: Dictionary-mapped term (e.g. "sugar" → "glucose")
  const { data: dictBridgeData } = useBridgeTests(
    backendSearchTerm ? { search: backendSearchTerm, limit: 15 } : undefined
  );
  // Query 2: Raw user query as-is (e.g. "Hemoglobin A1c" matches the LOINC name directly)
  const { data: rawBridgeData } = useBridgeTests(
    rawQuery && rawQuery !== backendSearchTerm ? { search: rawQuery, limit: 15 } : undefined
  );

  const searchResults = useMemo(() => {
    if (!debouncedSearchQuery.trim()) return [];
    
    const dictResults = dictBridgeData?.tests || [];
    const rawResults = rawBridgeData?.tests || [];
    
    // Merge and deduplicate by test ID
    const seen = new Set<string>();
    const merged: any[] = [];
    for (const test of [...rawResults, ...dictResults]) {
      if (!seen.has(test.id)) {
        seen.add(test.id);
        merged.push(test);
      }
    }
    
    // Client-side filter: match against original, friendly name, AND mapped synonym
    const q = debouncedSearchQuery.trim().toLowerCase();
    const mappedQ = backendSearchTerm?.toLowerCase();
    
    return merged.filter((test) => {
      const originalName = (test.test_name || test.name || "").toLowerCase();
      const friendlyName = simplifyTestName(test.test_name || test.name || "").toLowerCase();
      
      const matchesRaw = originalName.includes(q) || friendlyName.includes(q);
      const matchesMapped = mappedQ ? (originalName.includes(mappedQ) || friendlyName.includes(mappedQ)) : false;
      
      return matchesRaw || matchesMapped;
    });
  }, [debouncedSearchQuery, backendSearchTerm, dictBridgeData, rawBridgeData]);

  const isInCart = (testId: string, testName: string) => hasItem(testId, testName);

  const handleQuickAdd = (e: React.MouseEvent, test: any) => {
    e.stopPropagation();
    const ok = addToCart({
      id: test.id,
      name: test.name,
      price: test.price,
    });
    if (ok) {
      toast.success(`${test.name} added to cart!`);
    }
  };

  const HighlightText = ({ text, highlight }: { text: string; highlight: string }) => {
    if (!highlight.trim()) return <span>{text}</span>;
    const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
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
              <div className="bg-card border border-border/50 shadow-2xl shadow-black/5 rounded-2xl overflow-hidden max-h-[60vh] overflow-y-auto">
                {searchResults.length > 0 ? (
                  <div className="flex flex-col">
                    {searchResults.map((test) => {
                      const discount = test.discount_percent || 0;
                      const finalPrice = Math.round(test.price * (1 - discount / 100));
                      const testName = test.name || test.test_name || "Unknown Test";
                      const inCart = isInCart(test.id, testName);
                      return (
                        <button
                          key={test.id}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            // Aggressive prefetch on touch/down
                            navigate(`/test/${test.id}`, { state: { bridgeTest: test } });
                          }}
                          className="w-full text-left px-4 py-3 border-b border-border/40 last:border-0 hover:bg-muted/30 active:bg-muted/50 transition-colors flex justify-between items-center"
                        >
                          <div className="flex-1 min-w-0 pr-3">
                            <p className="text-[13px] font-semibold text-foreground leading-tight truncate">
                              <HighlightText text={simplifyTestName(testName)} highlight={searchQuery} />
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => handleQuickAdd(e, { ...test, name: testName })}
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
                        </button>
                      );
                    })}
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

        {/* Running Features Marquee */}
        <div className="mt-4 flex overflow-hidden whitespace-nowrap bg-primary/5 py-3 border-y border-primary/10 relative">
          {/* Gradient masks for smooth fade effect at edges */}
          <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-background to-transparent z-10" />
          <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent z-10" />
          
          <div className="animate-marquee inline-flex gap-8 px-4 items-center min-w-max">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="flex gap-8 items-center shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#ef4444] animate-pulse" />
                  <span className="text-[12px] font-black text-foreground/80 uppercase tracking-widest">ECG at Home</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#3b82f6] animate-pulse" />
                  <span className="text-[12px] font-black text-foreground/80 uppercase tracking-widest">Blood Pressure Check</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
                  <span className="text-[12px] font-black text-foreground/80 uppercase tracking-widest">Blood Test Booking</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#a855f7] animate-pulse" />
                  <span className="text-[12px] font-black text-foreground/80 uppercase tracking-widest">Doctor Consultations</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#f59e0b] animate-pulse" />
                  <span className="text-[12px] font-black text-foreground/80 uppercase tracking-widest">NABL Certified Labs</span>
                </div>
              </div>
            ))}
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

        {/* Quick Actions (Premium Banners) */}
        <section className="px-4 mt-8 flex flex-col gap-4" style={{ contain: "content" }}>
          <h2 className="text-xl font-black text-foreground tracking-tight mb-1">Our Services 🩺</h2>
          {quickActions.map((action, idx) => (
            <div
              key={action.label}
              onClick={() => navigate(action.path)}
              onPointerDown={() => {
                if (action.path === "/doctor-consult") import("../pages/DoctorConsultScreen");
                else if (action.path === "/ecg-test") import("../pages/ECGTestScreen");
                else if (action.path === "/bp-check") import("../pages/BPCheckScreen");
              }}
              className="home-render-section w-full relative overflow-hidden isolate bg-white rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.08)] cursor-pointer group active:opacity-95"
            >
              {/* Custom background image for specific tiles */}
              {action.bgImage && (
                <>
                  <div className="absolute right-0 top-0 bottom-0 w-[45%] z-0">
                    <OptimizedImage
                      src={action.bgImage}
                      alt="Background"
                      containerClassName="absolute inset-0 w-full h-full"
                      className="w-full h-full object-cover object-center"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-white via-transparent to-transparent z-10 pointer-events-none" />
                  </div>
                </>
              )}

              {/* Background glowing accent - using zero-cost GPU radial gradients instead of 64px Gaussian blurs */}
              {!action.bgImage && (
                <>
                  <div
                    className="absolute -right-10 -bottom-10 w-40 h-40 rounded-full pointer-events-none z-0"
                    style={{
                      background: action.gradient.includes("10b981")
                        ? "radial-gradient(circle, rgba(16,185,129,0.2) 0%, transparent 70%)"
                        : action.gradient.includes("f59e0b")
                        ? "radial-gradient(circle, rgba(245,158,11,0.2) 0%, transparent 70%)"
                        : "radial-gradient(circle, rgba(59,130,246,0.2) 0%, transparent 70%)",
                    }}
                  />
                  <div
                    className="absolute -left-10 -top-10 w-40 h-40 rounded-full pointer-events-none z-0"
                    style={{
                      background: action.gradient.includes("10b981")
                        ? "radial-gradient(circle, rgba(16,185,129,0.2) 0%, transparent 70%)"
                        : action.gradient.includes("f59e0b")
                        ? "radial-gradient(circle, rgba(245,158,11,0.2) 0%, transparent 70%)"
                        : "radial-gradient(circle, rgba(59,130,246,0.2) 0%, transparent 70%)",
                    }}
                  />
                </>
              )}

              <div className="relative z-10">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center">
                    <h3 className="text-foreground text-[16px] font-black tracking-tight leading-tight">
                      {action.label}
                    </h3>
                  </div>
                  <span className={`${action.badgeColor} border text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md shrink-0`}>
                    {action.badge}
                  </span>
                </div>
                
                <div className="flex items-center justify-start gap-1 mt-2 group/btn">
                  {action.price && (
                    <span className="text-[13px] font-bold text-foreground/70 mr-2">
                      {action.price}
                    </span>
                  )}
                  {(action as any).cta && (
                    <span className={`text-[12px] font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r ${action.gradient} mr-0.5`}>
                      {(action as any).cta}
                    </span>
                  )}
                  <ChevronRight 
                    className="w-5 h-5 transition-transform group-hover/btn:translate-x-1" 
                    color={action.gradient.match(/from-\[([^\]]+)\]/)?.[1] || 'currentColor'} 
                    strokeWidth={2.5}
                  />
                </div>
              </div>
            </div>
          ))}
        </section>



        {/* Health Packages (real-time, vendor-driven) */}
        <HealthPackagesSection />

        {/* Doctor Banner */}
        <section className="home-render-section px-4 mt-8 mb-8">
          <button onClick={() => navigate('/categories')} className="w-full relative overflow-hidden isolate rounded-3xl group active:scale-[0.98] transition-transform shadow-xl shadow-black/5 h-[200px] border border-border/50">
            
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
