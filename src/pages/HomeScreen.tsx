import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { useNavigate } from "react-router-dom";
import BannerGraphic from "@/components/BannerGraphic";
import { useBridgeTests } from "@/hooks/useBridgeTests";
import { useAuth } from "@/hooks/useAuth";
import { AnimatePresence, motion } from "framer-motion";
import {
  Search,
  Bell,
  ChevronRight,
  HeartPulse,
  Activity,
  X,
  RefreshCw,
  FileUp,
  Stethoscope,
  Plus,
  Phone,
  RotateCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import MobileLayout from "@/components/layout/MobileLayout";
import { supabase } from "@/integrations/supabase/client";
import { useNotifications } from "@/contexts/NotificationContext";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useRealtimeProducts } from "@/hooks/useRealtimeProducts";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import DiagnosticCentersCarousel from "@/components/home/DiagnosticCentersCarousel";
import { useUserPincode, labServesPincode } from "@/hooks/useUserPincode";
import LocationChip from "@/components/home/LocationChip";
import { useSEO } from "@/hooks/useSEO";

// Get greeting based on current time
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  if (hour >= 17 && hour < 21) return "Good evening";
  return "Good night";
};

const quickActions = [
  { icon: FileUp, label: "Upload Prescription", path: "/upload-prescription", color: "bg-primary/10 text-primary" },
  { icon: Stethoscope, label: "Consult Doctor", path: "/doctor-consult", color: "bg-success/10 text-success" },
  { icon: Activity, label: "Consult Physiotherapist", path: "/physio-consult", color: "bg-secondary/10 text-secondary" },
  { icon: HeartPulse, label: "ECG Test", path: "/ecg-test", color: "bg-destructive/10 text-destructive" },
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
  useSEO({ title: "BloodLyn — Book Health Tests at Home", description: "Book NABL-certified home health tests in 60 minutes with live tracking and AI-powered reports on BloodLyn." });
  const navigate = useNavigate();
  const { unreadCount } = useNotifications();
  const { user } = useAuth();
  const { addToCart, items } = useCart();
  const [searchQuery, setSearchQuery] = useState("");
  const [greeting, setGreeting] = useState(getGreeting());
  const [allTests, setAllTests] = useState<any[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showCallSheet, setShowCallSheet] = useState(false);
  const [previousOrders, setPreviousOrders] = useState<PreviousOrder[]>([]);
  const [diagnosticCenters, setDiagnosticCenters] = useState<{id: string; name: string; rating: number; tests: number; logo?: string}[]>([]);
  const [healthPackages, setHealthPackages] = useState<any[]>([]);

  // Subscribe to real-time product updates
  useRealtimeProducts();

  // Fetch bridge tests catalog
  const { data: bridgeData } = useBridgeTests();
  // Fetch previous orders
  const fetchPreviousOrders = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("orders")
      .select("id, order_number, test_name, total, status, created_at")
      .order("created_at", { ascending: false })
      .limit(4);
    if (data) setPreviousOrders(data);
  }, [user]);

  // Fetch all tests for search
  const fetchTests = useCallback(async () => {
    const { data } = await supabase
      .from("tests")
      .select("id, name, price, original_price, discount_percent")
      .eq("is_active", true);
    if (data) setAllTests(data);
  }, []);

  const { pincode: userPincode, loading: pincodeLoading } = useUserPincode();

  // Fetch diagnostic centers (filtered by user's serviceable pincode — Zomato-style)
  const fetchDiagnosticCenters = useCallback(async () => {
    const { data } = await supabase
      .from("diagnostic_centers")
      .select("*")
      .order("rating", { ascending: false });
    if (data) {
      const serviceable = data.filter((c) => labServesPincode(c as any, userPincode));
      setDiagnosticCenters(serviceable.slice(0, 10).map(center => ({
        id: center.id,
        name: center.name,
        rating: center.rating || 4.5,
        tests: center.reviews_count || 100,
        logo: center.logo_url || undefined,
        isActive: center.is_active !== false,
      })));
    }
  }, [userPincode]);

  // Health packages fetch removed — replaced with ad banner

  // Refresh handler for pull-to-refresh
  const handleRefresh = useCallback(async () => {
    await Promise.all([fetchTests(), fetchDiagnosticCenters(), fetchPreviousOrders()]);
    toast.success("Data refreshed!");
  }, [fetchTests, fetchDiagnosticCenters, fetchPreviousOrders]);

  const {
    isRefreshing,
    pullDistance,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  } = usePullToRefresh({ onRefresh: handleRefresh, threshold: 80 });

  // Update greeting every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setGreeting(getGreeting());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Fetch tests, centers and packages on mount
  useEffect(() => {
    fetchTests();
    fetchDiagnosticCenters();
    fetchPreviousOrders();
  }, [fetchTests, fetchDiagnosticCenters, fetchPreviousOrders]);

  // Filter tests based on search query — merges Supabase tests + bridge tests
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];

    const pool: any[] = [];

    // Add supabase tests
    if (allTests?.length) {
      allTests.forEach((t: any) => pool.push({
        id: t.id, name: t.name, price: t.price, original_price: t.original_price, discount_percent: t.discount_percent, category: "",
      }));
    }

    // Add bridge tests — individual tests, not just categories
    if (bridgeData?.tests?.length) {
      bridgeData.tests.forEach((t) => pool.push({
        id: t.id, name: t.test_name, price: t.price, original_price: Math.round(t.price * 1.4), discount_percent: 29, category: t.category,
      }));
    }

    // No fallback needed for search — just skip if no results
    // Deduplicate by name
    const seen = new Set<string>();
    const deduped = pool.filter((item) => {
      const key = item.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return deduped.filter((item: any) => {
      const name = (item.name || "").toLowerCase();
      return name.includes(q);
    }).slice(0, 7);
  }, [searchQuery, allTests, bridgeData]);

  const handleSearchKeyDown = (e: any) => {
    if (e.key === "Enter") {
      if (searchResults.length > 0) {
        const test = searchResults[0];
        setShowSearchResults(false);
        setSearchQuery("");
        if (String(test.id).startsWith("trending-")) {
          navigate("/test/select", { state: { test } });
        } else {
          navigate(`/test/select/${test.id}`);
        }
      }
    }
  };

  const isInCart = (testId: string) => items.some((item) => item.id === testId);

  const handleAddFromSearch = (test: any) => {
    if (isInCart(test.id)) {
      navigate("/cart");
      return;
    }
    const success = addToCart({
      id: test.id,
      name: test.name,
      price: test.price,
    });
    if (success) {
      toast.success(`${test.name} added to cart`);
    }
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative home-aurora"
    >
      {/* Ambient aurora background — pure CSS, GPU-composited, no paint cost on scroll */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[420px] overflow-hidden -z-0">
        <div className="aurora-blob aurora-blob-1" />
        <div className="aurora-blob aurora-blob-2" />
        <div className="aurora-grid" />
      </div>

      {/* Pull to Refresh Indicator */}
      <AnimatePresence>
        {(pullDistance > 0 || isRefreshing) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
            style={{ 
              height: Math.max(pullDistance, isRefreshing ? 60 : 0),
              paddingTop: "env(safe-area-inset-top, 0px)"
            }}
          >
            <motion.div
              animate={{ 
                rotate: isRefreshing ? 360 : (pullDistance / 80) * 180,
              }}
              transition={isRefreshing ? { 
                repeat: Infinity, 
                duration: 1, 
                ease: "linear" 
              } : { duration: 0 }}
            >
              <RefreshCw 
                className={`w-6 h-6 ${pullDistance >= 80 || isRefreshing ? 'text-primary' : 'text-muted-foreground'}`} 
              />
            </motion.div>
            {pullDistance >= 80 && !isRefreshing && (
              <span className="ml-2 text-sm text-primary font-medium">Release to refresh</span>
            )}
            {isRefreshing && (
              <span className="ml-2 text-sm text-primary font-medium">Refreshing...</span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      
      <MobileLayout>
      {/* Header */}
      <header
        className="px-4 pt-4 pb-2"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 12px) + 16px)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/80 font-semibold">{greeting}</p>
            <h1 className="text-[22px] font-extrabold text-foreground tracking-tight leading-tight">
              Welcome back <span className="inline-block hover:rotate-12 transition-transform duration-300">👋</span>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="icon-btn icon-btn-glass relative"
              onClick={() => setShowCallSheet(true)}
              aria-label="Contact support"
            >
              <Phone className="w-5 h-5 text-foreground" />
            </button>
            <button
              className="icon-btn icon-btn-glass relative"
              onClick={() => navigate("/notifications")}
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5 text-foreground" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-destructive rounded-full flex items-center justify-center text-[10px] font-bold text-destructive-foreground ring-2 ring-background">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>


        {/* Search bar */}
        <div className="relative search-shell">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-10" />
          <input
            type="text"
            placeholder="Search tests, packages..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearchResults(true);
            }}
            onFocus={() => setShowSearchResults(true)}
            onKeyDown={handleSearchKeyDown}
            className="search-input search-input-premium"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery("");
                setShowSearchResults(false);
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10"
              aria-label="Clear search"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}

          
          {/* Search Results Dropdown */}
          <AnimatePresence>
            {showSearchResults && searchResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden"
              >
                {searchResults.map((test) => (
                  <div
                    key={test.id}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors text-left border-b border-border last:border-0"
                  >
                    <button
                      className="flex-1 min-w-0 text-left"
                      onClick={() => {
                        setShowSearchResults(false);
                        setSearchQuery("");
                        if (String(test.id).startsWith("trending-")) {
                          navigate("/test/select", { state: { test } });
                        } else {
                          navigate(`/test/select/${test.id}`);
                        }
                      }}
                    >
                      <p className="font-medium text-foreground text-sm">{test.name}</p>
                      {test.discount_percent > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {test.discount_percent}% off
                        </p>
                      )}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddFromSearch(test);
                      }}
                      className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ml-2 ${
                        isInCart(test.id) 
                          ? "bg-success/10 text-success" 
                          : "bg-primary/10 text-primary"
                      }`}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* Delivery location chip */}
      <LocationChip />

      {/* Diagnostic Centers Carousel */}
      {diagnosticCenters.length === 0 ? (
        <section className="px-4 mt-4">
          <div className="flex gap-3 overflow-hidden">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex-shrink-0 w-40 h-24 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        </section>
      ) : (
        <DiagnosticCentersCarousel centers={diagnosticCenters} />
      )}

      {/* Quick Actions */}
      <section className="px-4 mt-6">
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map((action) => (
            <button
              key={action.label}
              onClick={() => navigate(action.path)}
              className="quick-action group relative overflow-hidden flex items-center gap-3 p-4 text-left"
            >
              <span className="quick-action-sheen" aria-hidden />
              <div className={`w-12 h-12 rounded-2xl ${action.color} flex items-center justify-center shrink-0 transition-transform duration-300 group-active:scale-90`}>
                <action.icon className="w-6 h-6" />
              </div>
              <span className="text-[13px] font-semibold text-foreground leading-tight">{action.label}</span>
            </button>
          ))}
        </div>
      </section>


      {/* Previous Orders */}
      <section className="mt-8">
        <div className="flex items-center justify-between px-4 mb-4">
          <h2 className="text-lg font-bold text-foreground">Previous Orders 📦</h2>
          {previousOrders.length > 0 && (
            <button 
              onClick={() => navigate('/bookings')}
              className="flex items-center gap-1 text-primary text-sm font-medium"
            >
              View all <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
        {previousOrders.length === 0 ? (
          <div className="overflow-x-auto scrollbar-hide">
            <div className="flex gap-3 px-4 pb-2" style={{ width: 'max-content' }}>
              {[1, 2, 3].map((i) => (
                <div key={i} className="soft-card p-4" style={{ width: '200px', minHeight: '140px' }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-10 h-10 rounded-xl bg-muted animate-pulse" />
                    <div className="w-16 h-5 rounded-full bg-muted animate-pulse" />
                  </div>
                  <div className="w-3/4 h-4 rounded bg-muted animate-pulse mb-2" />
                  <div className="w-1/2 h-3 rounded bg-muted animate-pulse mb-3" />
                  <div className="flex justify-between">
                    <div className="w-12 h-5 rounded bg-muted animate-pulse" />
                    <div className="w-16 h-7 rounded-lg bg-muted animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-hide">
            <div className="flex gap-3 px-4 pb-2" style={{ width: 'max-content' }}>
              {previousOrders.map((order) => (
                <div
                  key={order.id}
                  className="soft-card p-4 flex flex-col justify-between"
                  style={{ width: '200px', minHeight: '140px' }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Activity className="w-5 h-5 text-primary" />
                    </div>
                    <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full capitalize">
                      {order.status || "pending"}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0 mb-2">
                    <h3 className="font-semibold text-foreground text-sm line-clamp-2 leading-tight">
                      {order.test_name || "Lab Test"}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {order.order_number || `#${order.id.slice(0, 8)}`}
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-base font-bold text-foreground">₹{order.total}</p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const testName = order.test_name || "Lab Test";
                        const success = addToCart({
                          id: `reorder-${order.id}`,
                          name: testName,
                          price: order.total,
                        });
                        if (success) toast.success(`${testName} added to cart`);
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-semibold active:scale-95 transition-transform"
                    >
                      <RotateCw className="w-3 h-3" />
                      Reorder
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Doctor Advertisement Banner */}
      <section className="px-4 mt-8 mb-6">
        <button
          onClick={() => navigate('/categories')}
          className="w-full relative overflow-hidden rounded-2xl group"
        >
          <BannerGraphic
            variant={0}
            className="w-full h-44 block"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-primary/60 via-primary/30 to-transparent" />
          <div className="absolute inset-0 flex flex-col justify-center px-5">
            <p className="text-white/80 text-xs font-medium mb-1 text-left">Doctor Recommended</p>
            <h3 className="text-white text-lg font-bold leading-tight text-left">Get Your Health<br/>Tests Done Today</h3>
            <p className="text-white/70 text-xs mt-1.5 text-left">Browse 100+ tests across all categories</p>
            <div className="mt-3 flex items-center gap-2">
              <span className="bg-white text-primary text-xs font-bold px-4 py-1.5 rounded-full">
                Browse Tests →
              </span>
            </div>
          </div>
        </button>
      </section>

      {/* Contact Bottom Sheet */}
      <AnimatePresence>
        {showCallSheet && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-50"
              onClick={() => setShowCallSheet(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto bg-card rounded-t-3xl z-50 safe-area-bottom my-[31px] py-[35px] rounded-none"
            >
              <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mt-3 mb-4 py-0 my-[4px]" />
              <div className="px-6 pb-8">
                <h3 className="text-lg font-bold text-foreground mb-4 py-0">Contact Us</h3>
                <div className="space-y-3">
                  <a
                    href="tel:+919883143033"
                    className="flex items-center gap-4 p-4 bg-primary/5 rounded-2xl hover:bg-primary/10 transition-colors py-[17px]"
                  >
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Phone className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Direct Call</p>
                      <p className="text-sm text-muted-foreground">+91 9883143033</p>
                    </div>
                  </a>
                  <a
                    href="https://wa.me/919883143033"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 p-4 bg-success/5 rounded-2xl hover:bg-success/10 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center">
                      <svg className="w-5 h-5 text-success" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Chat on WhatsApp</p>
                      <p className="text-sm text-muted-foreground">+91 9883143033</p>
                    </div>
                  </a>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      </MobileLayout>
    </div>
  );
};

export default HomeScreen;