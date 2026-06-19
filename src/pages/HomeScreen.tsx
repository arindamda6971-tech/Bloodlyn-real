import { useState, useEffect, useMemo, useCallback, useRef } from "react";
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
import { useRealtimeProducts } from "@/hooks/useRealtimeProducts";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import DiagnosticCentersCarousel from "@/components/home/DiagnosticCentersCarousel";
import { useUserPincode } from "@/hooks/useUserPincode";
import { useDiagnosticCenters } from "@/hooks/useDiagnosticCenters";
import { usePreviousOrders } from "@/hooks/usePreviousOrders";
import LocationChip from "@/components/home/LocationChip";
import { useSEO } from "@/hooks/useSEO";
import { formatTestsLabel, splitTestNames } from "@/lib/format-tests";
import StickySearch from "@/components/ui/StickySearch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Optimized greeting
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
  useSEO({ title: "BloodLyn — Book Health Tests at Home", description: "Book NABL-certified home health tests in 60 minutes." });
  const navigate = useNavigate();
  const carouselRef = useRef<HTMLDivElement>(null);
  const { unreadCount } = useNotifications();
  const { user } = useAuth();
  const { addToCart, items, clearCart, replaceCart } = useCart();
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [greeting, setGreeting] = useState(getGreeting());
  const [allTests, setAllTests] = useState<any[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showCallSheet, setShowCallSheet] = useState(false);
  const [reorderConfirm, setReorderConfirm] = useState<any | null>(null);

  const handleReorder = async (order: any) => {
    const toastId = toast.loading("Adding items to cart...");
    
    const { data: orderItems, error } = await supabase
      .from("order_items")
      .select("*")
      .eq("order_id", order.id);

    if (error || !orderItems || orderItems.length === 0) {
      toast.error("Failed to load order items.", { id: toastId });
      // Fallback
      replaceCart([{
        id: `reorder-${order.id}`,
        name: order.test_name || "Lab Test",
        price: order.total,
      }]);
      navigate('/cart');
      return;
    }

    const testIds = orderItems.map((i) => i.test_id).filter(Boolean) as string[];
    const packageIds = orderItems.map((i) => i.package_id).filter(Boolean) as string[];

    const namesMap: Record<string, string> = {};
    
    if (testIds.length > 0) {
      const { data: tests } = await supabase.from("tests").select("id, name").in("id", testIds);
      tests?.forEach((t) => (namesMap[t.id] = t.name));
    }
    if (packageIds.length > 0) {
      const { data: packages } = await supabase.from("test_packages").select("id, name").in("id", packageIds);
      packages?.forEach((p) => (namesMap[p.id] = p.name));
    }

    const testNamesFromOrder = splitTestNames(order.test_name);

    const newCartItems = orderItems.map((item, index) => {
      const refId = item.test_id || item.package_id || item.id;
      let resolvedName = "Lab Test";
      
      if (namesMap[refId]) {
        resolvedName = namesMap[refId];
      } else if (testNamesFromOrder[index]) {
        resolvedName = testNamesFromOrder[index];
      }

      return {
        id: refId,
        name: resolvedName,
        price: Number(item.price) || 0,
        labId: (item as any).lab_id || undefined,
        labName: (item as any).lab_name || undefined,
      };
    });

    replaceCart(newCartItems);
    toast.success("Items added to cart!", { id: toastId });
    navigate('/cart');
  };

  const { data: bridgeData } = useBridgeTests();
  const { pincode: userPincode } = useUserPincode();

  const { data: ordersData } = usePreviousOrders(3);
  const { data: centersData } = useDiagnosticCenters(userPincode);

  const previousOrders = ordersData || [];
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

  // Performance optimized background
  const StaticBackground = useMemo(() => (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-primary/5 to-transparent" />
      <div className="absolute top-[-50px] left-[-50px] w-80 h-80 bg-primary/10 rounded-full blur-[120px]" />
    </div>
  ), []);

  const fetchTests = useCallback(async () => {
    const { data } = await supabase
      .from("tests")
      .select("id, name, price, original_price, discount_percent")
      .eq("is_active", true);
    if (data) setAllTests(data);
  }, []);

  useEffect(() => {
    fetchTests();
  }, [fetchTests]);

  const searchResults = useMemo(() => {
    const q = debouncedSearchQuery.trim().toLowerCase();
    if (!q) return [];
    const pool: any[] = [];
    allTests.forEach((t) => pool.push({ id: t.id, name: t.name, price: t.price, discount_percent: t.discount_percent }));
    if (bridgeData?.tests) {
      bridgeData.tests.forEach((t) => pool.push({ id: t.id, name: t.test_name, price: t.price, discount_percent: 25 }));
    }
    const seen = new Set<string>();
    return pool.filter(item => {
      const name = (item.name || "").toLowerCase();
      if (!name.includes(q) || seen.has(name)) return false;
      seen.add(name);
      return true;
    }).slice(0, 5);
  }, [debouncedSearchQuery, allTests, bridgeData]);

  const isInCart = (testId: string) => items.some((item) => item.id === testId);

  return (
    <div className="relative bg-background min-h-screen">
      {StaticBackground}

      <MobileLayout>
        {/* Simplified Header for Performance */}
        <StickySearch
          value={searchQuery}
          onChange={(v) => { setSearchQuery(v); setShowSearchResults(true); }}
          onFocus={() => setShowSearchResults(true)}
          placeholder="Search health tests..."
          header={
            <div className="flex items-center justify-between mb-2.5 mt-1.5">
              <div className="min-w-0 pt-1">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary/80 mb-0.5">{greeting}</p>
                <h1 className="text-2xl font-black text-foreground tracking-tight leading-none">Welcome back 👋</h1>
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  className="w-11 h-11 rounded-xl bg-card border border-border/50 shadow-sm flex items-center justify-center active:scale-90 transition-transform"
                  onClick={() => setShowCallSheet(true)}
                >
                  <Phone className="w-5 h-5 text-foreground" />
                </button>
                <button
                  className="w-11 h-11 rounded-xl bg-card border border-border/50 shadow-sm flex items-center justify-center relative active:scale-90 transition-transform"
                  onClick={() => navigate("/notifications")}
                >
                  <Bell className="w-5 h-5 text-foreground" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-primary rounded-full flex items-center justify-center text-[10px] font-black text-primary-foreground ring-2 ring-background">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>
              </div>
            </div>
          }
          results={
            showSearchResults && searchQuery.trim() ? (
              <div className="bg-card border border-border/50 shadow-2xl shadow-black/5 rounded-2xl overflow-hidden max-h-[60vh] overflow-y-auto">
                {searchResults.length > 0 ? (
                  <div className="flex flex-col">
                    {searchResults.map((test) => {
                      const discount = test.discount_percent || 0;
                      const finalPrice = Math.round(test.price * (1 - discount / 100));
                      return (
                        <button
                          key={test.id}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setSearchQuery("");
                            navigate(`/test/${test.id}`);
                          }}
                          className="w-full text-left px-4 py-3 border-b border-border/40 last:border-0 hover:bg-muted/30 active:bg-muted/50 transition-colors flex justify-between items-center"
                        >
                          <div className="flex-1 min-w-0 pr-3">
                            <p className="text-[13px] font-bold text-foreground leading-tight truncate">{test.name}</p>
                            {discount > 0 && (
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className="text-[10px] font-semibold text-muted-foreground line-through">₹{test.price}</span>
                                <span className="text-[10px] font-black text-success">{discount}% OFF</span>
                              </div>
                            )}
                          </div>
                          <p className="text-sm font-black text-primary shrink-0">₹{finalPrice}</p>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-6 text-center">
                    <p className="text-xs font-bold text-muted-foreground">No tests found for "{searchQuery}"</p>
                  </div>
                )}
              </div>
            ) : null
          }
        />

        <LocationChip />

        {/* Diagnostic Centers */}
        {diagnosticCenters.length > 0 && (
          <div className="mt-4 transform-gpu">
            <DiagnosticCentersCarousel centers={diagnosticCenters} />
          </div>
        )}

        {/* Quick Actions */}
        <section className="px-4 mt-6 transform-gpu">
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={() => navigate(action.path)}
                className="bg-card border border-border/50 rounded-3xl p-4 text-left flex items-center gap-3 active:scale-[0.97] transition-transform shadow-sm"
              >
                <div className={`w-12 h-12 rounded-2xl ${action.color} flex items-center justify-center shrink-0`}>
                  <action.icon className="w-6 h-6" />
                </div>
                <span className="text-[13px] font-bold text-foreground leading-tight">{action.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Recent Orders */}
        {previousOrders.length > 0 && (
          <section className="mt-10 transform-gpu">
            <div className="flex items-center justify-between px-6 mb-4">
              <h2 className="text-xl font-black text-foreground tracking-tight">Recent Orders 📦</h2>
              <button onClick={() => navigate('/bookings')} className="text-primary text-xs font-black bg-primary/10 px-3 py-1.5 rounded-full">
                View all
              </button>
            </div>
            <div className="overflow-x-auto scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch', overscrollBehaviorX: 'contain' }}>
              <div className="flex gap-4 px-6 pb-4" style={{ width: 'max-content' }}>
                {previousOrders.map((order) => {
                  const names = splitTestNames(order.test_name);
                  const label = formatTestsLabel(names, "Lab Test");
                  return (
                    <div key={order.id} className="bg-card border border-border/40 rounded-3xl p-4 flex flex-col justify-between shadow-sm hover:shadow-md w-56 relative overflow-hidden z-0">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-full -z-10 transition-colors" />
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0 pr-2">
                          <h3 className="font-extrabold text-foreground text-[15px] line-clamp-2 leading-tight">{label}</h3>
                          <p className="text-[10px] font-bold text-muted-foreground/60 mt-1 uppercase tracking-wider">{new Date(order.created_at).toLocaleDateString()}</p>
                        </div>
                        <Badge variant="secondary" className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md shadow-sm bg-primary/10 text-primary shrink-0">
                          {order.status || "pending"}
                        </Badge>
                      </div>
                      <div className="flex items-end justify-between mt-2 pt-3 border-t border-border/40">
                        <div className="flex flex-col">
                          <span className="text-[9px] font-bold text-muted-foreground/50 uppercase tracking-widest">Total</span>
                          <span className="text-lg font-black text-foreground leading-none mt-1">₹{order.total}</span>
                        </div>
                        <button
                          onClick={() => {
                            if (items.length > 0) {
                              setReorderConfirm(order);
                            } else {
                              handleReorder(order);
                            }
                          }}
                          className="w-9 h-9 bg-primary text-primary-foreground rounded-xl flex items-center justify-center active:scale-90 transition-transform shadow-md shadow-primary/20 shrink-0"
                        >
                          <RotateCw className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* Doctor Banner */}
        <section className="px-4 mt-8 mb-8 transform-gpu">
          <button onClick={() => navigate('/categories')} className="w-full relative overflow-hidden rounded-3xl group active:scale-[0.98] transition-transform">
            <BannerGraphic variant={0} className="w-full h-44 block object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-primary/80 via-primary/40 to-transparent" />
            <div className="absolute inset-0 flex flex-col justify-center px-6">
              <p className="text-white/80 text-[10px] font-black uppercase tracking-widest mb-1">Doctor Recommended</p>
              <h3 className="text-white text-xl font-black leading-tight">Full Body Health<br/>Checkup Today</h3>
              <div className="mt-4 flex items-center">
                <span className="bg-white text-primary text-[11px] font-black px-5 py-2 rounded-2xl shadow-xl shadow-black/10">
                  Book Now →
                </span>
              </div>
            </div>
          </button>
        </section>

        {/* Contact Bottom Sheet */}
        <AnimatePresence>
          {showCallSheet && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-[60]" onClick={() => setShowCallSheet(false)} />
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 400 }}
                className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto bg-card rounded-t-[2.5rem] z-[70] pb-10 pt-4"
              >
                <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mb-6" />
                <div className="px-6">
                  <h3 className="text-xl font-black text-foreground mb-6">Contact BloodLyn</h3>
                  <div className="space-y-3">
                    <a href="tel:+919883143033" className="flex items-center gap-4 p-5 bg-primary/5 rounded-[2rem] active:scale-95 transition-transform">
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center"><Phone className="w-5 h-5 text-primary" /></div>
                      <div><p className="font-bold text-foreground">Voice Call</p><p className="text-xs text-muted-foreground">+91 9883143033</p></div>
                    </a>
                    <a href="https://wa.me/919883143033" target="_blank" className="flex items-center gap-4 p-5 bg-success/5 rounded-[2rem] active:scale-95 transition-transform">
                      <div className="w-12 h-12 rounded-2xl bg-success/10 flex items-center justify-center">
                        <svg className="w-6 h-6 text-success" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                      </div>
                      <div><p className="font-bold text-foreground">WhatsApp</p><p className="text-xs text-muted-foreground">Quick Support</p></div>
                    </a>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
        {/* Reorder Confirmation Dialog */}
        <AlertDialog open={!!reorderConfirm} onOpenChange={(open) => !open && setReorderConfirm(null)}>
          <AlertDialogContent className="w-[90vw] max-w-[400px] rounded-[2rem]">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl font-black">Clear Cart?</AlertDialogTitle>
              <AlertDialogDescription className="text-[13px] font-medium text-muted-foreground leading-relaxed">
                Reordering these tests will clear out the tests currently in your cart. Do you want to proceed?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-6 flex-row gap-3">
              <AlertDialogCancel className="mt-0 flex-1 rounded-[1.5rem] h-12 text-sm font-bold border-border/50">Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="flex-1 rounded-[1.5rem] h-12 text-sm font-bold bg-primary text-white"
                onClick={() => {
                  if (reorderConfirm) {
                    handleReorder(reorderConfirm);
                    setReorderConfirm(null);
                  }
                }}
              >
                Clear & Reorder
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </MobileLayout>
    </div>
  );
};

export default HomeScreen;
