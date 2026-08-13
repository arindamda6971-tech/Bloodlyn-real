import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Clock,
  Users,
  Activity,
  Utensils,
  MapPin,
  ShoppingCart,
  ShieldCheck,
  BadgePercent,
  Bike,
  Stethoscope,
  Smartphone,
  AlertCircle,
  Building2,
  Star,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import MobileLayout from "@/components/layout/MobileLayout";
import LoadingSpinner from "@/components/ui/loading-spinner";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCart } from "@/contexts/CartContext";
import { useUserPincode, labServesPincode } from "@/hooks/useUserPincode";
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

import { useBridgeTests } from "@/hooks/useBridgeTests";

interface UnifiedTest {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  discountPercent?: number;
  reportTime?: string;
  fastingRequired?: boolean;
  fastingHours?: number;
  description?: string | null;
  prerequisites?: string | null;
  category?: string;
}

const whyBookItems = [
  { Icon: Bike, color: "from-rose-400 to-pink-500", text: "Free Home Sample Collection" },
  { Icon: Stethoscope, color: "from-sky-400 to-blue-500", text: "Results Reviewed by Specialists" },
  { Icon: Smartphone, color: "from-emerald-400 to-teal-500", text: "100% Accurate Digital Lab Reports" },
  { Icon: BadgePercent, color: "from-amber-400 to-orange-500", text: "Best Price & Deals Guaranteed" },
];

const TestDetailScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const { addToCart, itemCount, items, subtotal, pendingItem, confirmReplace, cancelReplace } = useCart();
  const { pincode } = useUserPincode();
  const { data: bridgeData } = useBridgeTests();

  const bridgeTest = (location.state as any)?.bridgeTest;
  const [test, setTest] = useState<UnifiedTest | null>(() => {
    if (bridgeTest) {
      return {
        id: bridgeTest.id,
        name: bridgeTest.test_name || bridgeTest.name,
        price: bridgeTest.price > 0 ? bridgeTest.price : bridgeTest.collection_fee || 0,
        reportTime: bridgeTest.report_delivery_time || bridgeTest.reportTime,
        prerequisites: bridgeTest.prerequisites,
        category: bridgeTest.category,
      };
    }
    return null;
  });
  const [loading, setLoading] = useState(!bridgeTest);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (test || !id) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const { data } = await supabase.from("tests").select("*").eq("id", id).maybeSingle();
        if (data) {
          setTest({
            id: data.id,
            name: data.name,
            price: data.price,
            originalPrice: data.original_price || undefined,
            discountPercent: data.discount_percent || undefined,
            reportTime: data.report_time_hours ? `${data.report_time_hours} hours` : undefined,
            fastingRequired: !!data.fasting_required,
            fastingHours: data.fasting_hours || undefined,
            description: data.description,
            prerequisites: data.preparation_instructions,
          });
          return;
        }

        if (bridgeData?.tests?.length) {
          const match = bridgeData.tests.find(
            (t) => t.id === id || ((t as any).slug && (t as any).slug === id) || t.test_name.toLowerCase() === id.toLowerCase()
          );
          if (match) {
            setTest({
              id: match.id,
              name: match.test_name,
              price: match.price > 0 ? match.price : match.collection_fee || 0,
              reportTime: match.report_delivery_time,
              prerequisites: match.prerequisites,
              category: match.category,
            });
            return;
          }
        }

        setError("Test not found");
      } catch {
        setError("Something went wrong");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, test, bridgeData]);

  // AI-fetched short description (replaces hardcoded sentence)
  const [aiDescription, setAiDescription] = useState<string>("");
  const [aiDescLoading, setAiDescLoading] = useState(false);
  useEffect(() => {
    if (!test?.name || test.description?.trim()) return;
    let cancelled = false;
    setAiDescLoading(true);
    (async () => {
      try {
        const { data } = await supabase.functions.invoke("test-description", {
          body: { testName: test.name },
        });
        if (!cancelled && data?.description) setAiDescription(String(data.description));
      } catch (err) {
        console.warn("test-description failed", err);
      } finally {
        if (!cancelled) setAiDescLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [test?.name, test?.description]);

  const [availableLabs, setAvailableLabs] = useState<any[]>([]);
  const [labsLoading, setLabsLoading] = useState(false);

  useEffect(() => {
    if (!test || !test.name) return;
    let cancelled = false;
    setLabsLoading(true);

    (async () => {
      try {
        const { data: labsData } = await supabase
          .from("diagnostic_centers")
          .select("*")
          .order("rating", { ascending: false });

        if (!labsData) return;

        const { data: productsData } = await supabase
          .from("products")
          .select("*")
          .eq("product_name", test.name)
          .eq("availability", true);

        if (!productsData || cancelled) return;

        const validLabs = labsData.filter((lab) => {
          if (pincode && !labServesPincode(lab, pincode)) return false;
          
          const product = productsData.find(p => p.vendor_id === lab.vendor_id);
          if (product) {
            lab.productPrice = product.price;
            return true;
          }
          return false;
        });

        if (!cancelled) setAvailableLabs(validLabs);
      } catch (err) {
        console.error("Error fetching labs for test:", err);
      } finally {
        if (!cancelled) setLabsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [test?.name, pincode]);

  const isInCart = useMemo(() => !!test && items.some((i) => i.id === test.id), [items, test]);

  const handleAddToCart = (lab?: any) => {
    if (!test) return;
    if (isInCart) {
      navigate("/cart");
      return;
    }
    const finalPrice = lab?.productPrice ?? test.price;
    const ok = addToCart({ 
      id: test.id, 
      name: test.name, 
      price: finalPrice,
      labId: lab?.id,
      labName: lab?.name,
      vendorId: lab?.vendor_id
    });
    if (ok) toast.success(`${test.name} added to cart`);
  };


  if (loading) {
    return (
      <MobileLayout showFloatingAdd={false}>
        <div className="flex items-center justify-center h-screen">
          <LoadingSpinner size="lg" />
        </div>
      </MobileLayout>
    );
  }

  if (error || !test) {
    return (
      <MobileLayout showFloatingAdd={false}>
        <div className="flex flex-col items-center justify-center h-[80vh] px-6 text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold mb-2">{error || "Test not found"}</h2>
          <Button onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </MobileLayout>
    );
  }

  const prereqText =
    test.prerequisites?.trim() ||
    "No special prerequisites. This test can be performed at any time of the day. Please carry a valid ID and any previous medical records for reference.";

  const aboutText =
    test.description?.trim() || aiDescription.trim() || "";


  return (
    <MobileLayout showFloatingAdd={false}>
      {/* Gradient Hero Header */}
      <div className="relative bg-gradient-to-br from-[#2196F3] via-[#1E88E5] to-[#1565C0] text-white px-4 pt-3 pb-8 rounded-b-3xl shadow-lg">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 active:scale-90 transition"
            aria-label="Back"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold tracking-tight">Lab Tests</h1>
          <div className="w-10 h-10" aria-hidden />
        </div>


        <div className="flex items-center gap-1.5 mt-3 text-white/95 text-sm">
          <MapPin className="w-4 h-4" />
          <span className="font-medium">{pincode ? `Pincode ${pincode}` : "Set your location"}</span>
        </div>

        {/* Floating test title card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="mt-5 bg-white text-foreground rounded-2xl shadow-xl px-4 py-4"
        >
          <p className="text-[10px] font-bold tracking-[0.18em] text-primary uppercase mb-1">
            {test.category || "Diagnostic Test"}
          </p>
          <motion.h2 layoutId={`test-name-${test.id}`} className="text-xl font-extrabold leading-tight text-secondary">{test.name}</motion.h2>
          <div className="flex items-center gap-2 mt-2">
            <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
              <ShieldCheck className="w-3 h-3" /> NABL Certified
            </span>
          </div>
        </motion.div>
        
        {/* Price Disclaimer */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-4 flex items-start gap-2 bg-white/10 p-3 rounded-xl border border-white/20"
        >
          <AlertCircle className="w-4 h-4 mt-0.5 text-blue-100 shrink-0" />
          <p className="text-xs text-blue-50 leading-relaxed font-medium">
            Prices vary by laboratory. Select a lab below to view pricing and add to cart.
          </p>
        </motion.div>
      </div>

      <div className="px-4 pt-6 pb-12 space-y-7">
        {/* About */}
        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <h3 className="text-[22px] font-bold text-secondary mb-3">About the test</h3>
          <div className="flex flex-wrap gap-2 mb-4">
            <Chip icon={<Utensils className="w-3.5 h-3.5 text-rose-500" />} label={test.fastingRequired ? `Fast ${test.fastingHours || 8}h` : "No Preparation"} />
            <Chip icon={<Users className="w-3.5 h-3.5 text-violet-500" />} label="Unisex" />
            <Chip icon={<Activity className="w-3.5 h-3.5 text-emerald-500" />} label="All Age Groups" />
            <Chip icon={<Clock className="w-3.5 h-3.5 text-sky-500" />} label={`Report in ${test.reportTime || "24h"}`} />
          </div>
          {aiDescLoading && !aboutText ? (
            <div className="space-y-2">
              <div className="h-3.5 w-full rounded bg-muted animate-pulse" />
              <div className="h-3.5 w-11/12 rounded bg-muted animate-pulse" />
              <div className="h-3.5 w-3/4 rounded bg-muted animate-pulse" />
            </div>
          ) : (
            <p className="text-[15px] leading-relaxed text-muted-foreground">
              {aboutText || `${test.name} — short description unavailable right now.`}
            </p>
          )}
        </motion.section>

        {/* Prerequisites */}
        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <h3 className="text-[22px] font-bold text-secondary mb-3">Prerequisites</h3>
          <p className="text-[15px] leading-relaxed text-muted-foreground mb-4">{prereqText}</p>

          <Accordion type="single" collapsible className="space-y-3">
            {[
              { v: "diseases", title: "Diseases Covered", body: "Helps detect and monitor a range of conditions related to this test category. Discuss results with your physician for accurate diagnosis." },
              { v: "body", title: "Body Functions", body: "Provides insights into key biochemical and physiological functions assessed by this panel." },
              { v: "lifestyle", title: "Life Style", body: "Use the results to make informed decisions around diet, exercise, sleep, and stress management." },
            ].map((it) => (
              <AccordionItem
                key={it.v}
                value={it.v}
                className="border border-border/60 rounded-2xl px-4 bg-card shadow-sm"
              >
                <AccordionTrigger className="text-base font-semibold text-secondary hover:no-underline py-4 [&>svg]:text-primary">
                  {it.title}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground pb-4">
                  {it.body}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.section>

        {/* Why book with us */}
        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <h3 className="text-[22px] font-bold text-secondary mb-4">Why to Book with us?</h3>
          <div className="space-y-4">
            {whyBookItems.map(({ Icon, color, text }, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className={`relative w-12 h-12 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center shadow-md`}>
                  <Icon className="w-6 h-6 text-white" />
                  <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-white flex items-center justify-center shadow">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                  </span>
                </div>
                <p className="text-[15px] font-medium text-secondary">{text}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* How to prepare */}
        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <h3 className="text-[22px] font-bold text-secondary mb-3">How to prepare for the Lab test ?</h3>
          <ul className="space-y-2 text-[15px] text-muted-foreground">
            <li className="flex gap-2"><span className="text-primary">—</span> Our Lab Technician will collect samples from Home</li>
            <li className="flex gap-2"><span className="text-primary">—</span> Stay well hydrated and rested before the collection</li>
            <li className="flex gap-2"><span className="text-primary">—</span> Carry a valid government photo ID for verification</li>
          </ul>
        </motion.section>

        {/* Inline Add to Cart CTA (replaces AI strip) */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="pt-2"
        >
          <h3 className="text-[22px] font-bold text-secondary mb-4">Select Laboratory</h3>
          
          {!pincode && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <p>You haven't set a pincode. We are showing all available labs. Please set your pincode at checkout for accurate availability.</p>
            </div>
          )}

          {labsLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-24 bg-muted animate-pulse rounded-2xl" />
              ))}
            </div>
          ) : availableLabs.length > 0 ? (
            <div className="space-y-4">
              {availableLabs.map((lab) => (
                <div key={lab.id} className="p-4 rounded-2xl border border-border/60 bg-card shadow-sm flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground text-base mb-1 truncate">{lab.name}</h4>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                      <div className="flex items-center gap-1 text-amber-500 font-medium bg-amber-50 px-1.5 py-0.5 rounded">
                        <Star className="w-3.5 h-3.5 fill-current" />
                        {lab.rating || "New"}
                      </div>
                      {lab.home_collection_available && (
                        <div className="flex items-center gap-1">
                          <Bike className="w-3.5 h-3.5" />
                          <span>Home Visit</span>
                        </div>
                      )}
                    </div>
                    <div className="font-bold text-lg text-primary">
                      ₹{lab.productPrice.toFixed(2)}
                    </div>
                  </div>
                  
                  <Button 
                    onClick={() => handleAddToCart(lab)}
                    className="shrink-0 bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors"
                  >
                    <ShoppingCart className="w-4 h-4 mr-1.5" />
                    Add
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center p-6 bg-muted/30 rounded-2xl border border-border/50">
              <Building2 className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No labs available for this test in your area right now.</p>
            </div>
          )}
          
          {itemCount > 0 && !isInCart && (
            <div className="mt-6 flex justify-between items-center bg-primary/5 p-4 rounded-2xl border border-primary/10">
              <div>
                <p className="text-xs text-muted-foreground">Cart total</p>
                <p className="font-bold text-primary">₹{subtotal}</p>
              </div>
              <Button onClick={() => navigate("/cart")} variant="outline" className="border-primary text-primary">
                View Cart ({itemCount})
              </Button>
            </div>
          )}
          
          {isInCart && (
            <Button
              onClick={() => navigate("/cart")}
              className="w-full h-14 mt-6 rounded-2xl text-base font-semibold bg-gradient-to-r from-[#2196F3] to-[#1565C0] text-white shadow-xl active:scale-[0.99]"
            >
              <ShoppingCart className="w-5 h-5 mr-2" />
              Go to Cart
            </Button>
          )}
        </motion.section>
      </div>


      <AlertDialog open={!!pendingItem} onOpenChange={(open) => !open && cancelReplace()}>
        <AlertDialogContent className="max-w-[90%] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Different Lab Selected</AlertDialogTitle>
            <AlertDialogDescription>
              You already have items from <span className="font-semibold text-foreground">{pendingItem?.existingLabName}</span>. Tests from another lab can't be mixed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-2">
            <AlertDialogCancel className="flex-1 mt-0" onClick={cancelReplace}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="flex-1"
              onClick={() => {
                confirmReplace();
                toast.success("Cart replaced");
              }}
            >
              Replace Cart
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MobileLayout>
  );
};

const Chip = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/60 border border-border/60 text-xs font-semibold text-secondary">
    {icon} {label}
  </span>
);

export default TestDetailScreen;
