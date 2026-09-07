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
  CheckCircle,
  Star,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
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
  const { addToCart, itemCount, items, subtotal, pendingItem, confirmReplace, cancelReplace, hasItem } = useCart();
  const { pincode } = useUserPincode();
  const { data: bridgeData } = useBridgeTests();

  const bridgeTest = (location.state as any)?.bridgeTest;
  const preselectedLab = (location.state as any)?.preselectedLab;
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
  const [showTrustSheet, setShowTrustSheet] = useState(false);
  const [showLabSheet, setShowLabSheet] = useState(false);
  const [fetchingLabs, setFetchingLabs] = useState(false);
  const [availableLabs, setAvailableLabs] = useState<any[]>([]);
  const [prepChecked, setPrepChecked] = useState<boolean[]>([]);

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

  const isInCart = useMemo(() => !!test && hasItem(test.id, test.name), [items, test, hasItem]);

  const handleAddToCart = () => {
    if (!test) return;
    if (isInCart) {
      navigate("/cart");
      return;
    }
    
    setShowLabSheet(true);
    fetchLabsForTest();
  };

  const fetchLabsForTest = async () => {
    if (!test) return;
    setFetchingLabs(true);
    try {
      const { data, error } = await supabase
        .from("diagnostic_centers")
        .select("*")
        .order("rating", { ascending: false });
      
      if (error || !data) throw error;

      const pincodeFiltered = data.filter((d) => labServesPincode(d as any, pincode));
      
      const vendorIds = pincodeFiltered.filter(d => d.vendor_id).map(d => d.vendor_id!);
      const vendorProducts: Record<string, {name: string, price: number}[]> = {};
      if (vendorIds.length > 0) {
        const { data: products } = await supabase
          .from("products")
          .select("*")
          .in("vendor_id", vendorIds)
          .eq("availability", true);
        if (products) {
          products.forEach((p) => {
            if (!vendorProducts[p.vendor_id]) vendorProducts[p.vendor_id] = [];
            const pName = (p.name || p.product_name || "").trim().toLowerCase();
            if (pName) {
              vendorProducts[p.vendor_id].push({
                name: pName,
                price: Number(p.price) || 0
              });
            }
          });
        }
      }
      
      const targetTestName = test.name.trim().toLowerCase();
      
      const matchedLabs = pincodeFiltered.map((lab: any) => {
        // Lab-specific pricing map: { "Test Name": price }
        const labPricing: Record<string, number> = {};
        if (lab.pricing && typeof lab.pricing === "object" && !Array.isArray(lab.pricing)) {
          for (const [k, v] of Object.entries(lab.pricing as Record<string, any>)) {
            const key = String(k).trim().toLowerCase();
            const val = Number(v);
            if (key && Number.isFinite(val) && val > 0) labPricing[key] = val;
          }
        }

        const baseTests = Array.isArray(lab.available_tests) ? lab.available_tests : [];
        const additionalTests = (lab.vendor_id && vendorProducts[lab.vendor_id])
          ? vendorProducts[lab.vendor_id].map(vp => ({ test_name: vp.name, price: vp.price }))
          : [];
        
        const allTests = [...baseTests, ...additionalTests];
        
        const nameOf = (t: any) =>
          String(typeof t === 'string' ? t : (t.test_name || t.name || t.product_name || ""))
            .trim()
            .toLowerCase();

        // Prefer an exact name match, then fall back to a partial match
        const matchingTest =
          allTests.find((t: any) => nameOf(t) === targetTestName) ??
          allTests.find((t: any) => {
            const tName = nameOf(t);
            return tName && (tName.includes(targetTestName) || targetTestName.includes(tName));
          });
        
        if (!matchingTest) return null;
        
        const matchedName = nameOf(matchingTest);
        // Price priority: lab pricing map -> vendor product price -> catalog price
        const labPrice =
          labPricing[matchedName] ??
          labPricing[targetTestName] ??
          (typeof matchingTest === 'string' ? undefined : Number(matchingTest.price) || undefined);
        
        return {
          ...lab,
          testPrice: labPrice && labPrice > 0 ? labPrice : (Number(test.price) || 0),
        };
      }).filter(Boolean);

      
      setAvailableLabs(matchedLabs);
    } catch (e) {
      console.error(e);
      toast.error("Failed to fetch labs");
    } finally {
      setFetchingLabs(false);
    }
  };

  const selectLabAndAdd = (lab: any) => {
    if (!test) return;
    
    const ok = addToCart({
      id: test.id,
      name: test.name,
      price: lab.testPrice,
      labId: lab.id,
      labName: lab.name,
      vendorId: lab.vendor_id,
      category: test.category || "Blood Tests",
      kind: "test",
    });
    
    if (ok) {
      setShowLabSheet(false);
      toast.success(`${test.name} added from ${lab.name}`);
      navigate(`/lab/${lab.id}`);
    }
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

  const prereqList = test.prerequisites 
    ? test.prerequisites.split(/,|\n/).map(p => p.trim()).filter(Boolean)
    : ["No special prerequisites required.", "Carry a valid government ID."];

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
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="mt-5 bg-white text-foreground rounded-2xl shadow-xl px-4 py-4"
        >
          <p className="text-[10px] font-bold tracking-[0.18em] text-primary uppercase mb-1">
            {test.category || "Diagnostic Test"}
          </p>
          <motion.h2 layoutId={`test-name-${test.id}`} className="text-xl font-extrabold leading-tight text-secondary">{test.name}</motion.h2>
          <div className="flex items-center gap-2 mt-2">
            <span 
              onClick={() => setShowTrustSheet(true)}
              className="ml-auto inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full cursor-pointer active:scale-95 transition-transform"
            >
              <ShieldCheck className="w-3 h-3" /> NABL Certified
            </span>
          </div>
        </motion.div>
        
        {/* Price Disclaimer or Specific Lab Price (Idea 2 & 4) */}
        {preselectedLab ? (
          <motion.div 
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0}}
            className="mt-4 flex items-center justify-between bg-white p-4 rounded-xl shadow-md border border-border/50"
          >
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Price at</p>
              <p className="text-sm font-bold text-foreground">{preselectedLab.name}</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-black text-primary">₹{preselectedLab.productPrice}</p>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0}}
            className="mt-4 flex items-start gap-2 bg-white/10 p-3 rounded-xl border border-white/20"
          >
            <AlertCircle className="w-4 h-4 mt-0.5 text-blue-100 shrink-0" />
            <p className="text-xs text-blue-50 leading-relaxed font-medium">
              Prices vary by laboratory. Add to cart to compare lab prices in your area.
            </p>
          </motion.div>
        )}
      </div>

      <div className="px-4 pt-6 pb-12 space-y-7">
        {/* About */}
        <motion.section initial={false} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0}}>
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



        <motion.section initial={false} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0}}>
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
        <motion.section initial={false} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0}}>
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
        <motion.section initial={false} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0}}>
          <h3 className="text-[22px] font-bold text-secondary mb-3">How to prepare for the Lab test ?</h3>
          <ul className="space-y-2 text-[15px] text-muted-foreground">
            <li className="flex gap-2"><span className="text-primary">—</span> Our Lab Technician will collect samples from Home</li>
            <li className="flex gap-2"><span className="text-primary">—</span> Stay well hydrated and rested before the collection</li>
            <li className="flex gap-2"><span className="text-primary">—</span> Carry a valid government photo ID for verification</li>
          </ul>
        </motion.section>

        {/* Inline Add to Cart CTA (replaces AI strip) */}
        <motion.div
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0}}
          className="pt-2"
        >
          {itemCount > 0 && !isInCart && (
            <p className="text-xs text-muted-foreground mb-2 text-center">
              {itemCount} {itemCount === 1 ? "test" : "tests"} already in cart · ₹{subtotal}
            </p>
          )}
          <div className="active:scale-95 transition-transform duration-100 ease-out press">
            <Button
              onClick={handleAddToCart}
              className="w-full h-14 rounded-2xl text-base font-semibold bg-gradient-to-r from-[#2196F3] to-[#1565C0] text-white shadow-xl transition-all"
            >
              <ShoppingCart className="w-5 h-5 mr-2" />
              {isInCart ? "Go to Cart" : "Add to Cart"}
            </Button>
          </div>
        </motion.div>
      </div>

      {/* Trust Sheet */}
      <Sheet open={showTrustSheet} onOpenChange={setShowTrustSheet}>
        <SheetContent side="bottom" className="rounded-t-3xl min-h-[300px]">
          <SheetHeader>
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mb-2 mx-auto">
              <ShieldCheck className="w-7 h-7 text-emerald-600" />
            </div>
            <SheetTitle className="text-center text-xl">NABL Certified Quality</SheetTitle>
            <SheetDescription className="text-center text-base mt-2">
              National Accreditation Board for Testing and Calibration Laboratories (NABL) accreditation ensures that our partner labs maintain the highest international standards for quality and competence.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              <p className="text-sm font-medium">99.9% Testing Accuracy Guaranteed</p>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              <p className="text-sm font-medium">Strict Quality Control Protocols</p>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              <p className="text-sm font-medium">Internationally Recognized Results</p>
            </div>
          </div>
          <div className="mt-8">
            <Button onClick={() => setShowTrustSheet(false)} className="w-full h-12 rounded-xl text-base font-semibold">
              Got it
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Lab Selection Sheet */}
      <Sheet open={showLabSheet} onOpenChange={setShowLabSheet}>
        <SheetContent side="bottom" className="rounded-t-3xl min-h-[400px] max-h-[85vh] flex flex-col p-0">
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/40">
            <SheetTitle className="text-xl">Select a Lab</SheetTitle>
            <SheetDescription>
              Choose a lab that provides this test to continue
            </SheetDescription>
          </SheetHeader>
          
          <div className="flex-1 overflow-y-auto p-6">
            {fetchingLabs ? (
              <div className="flex flex-col items-center justify-center py-10">
                <LoadingSpinner size="md" />
                <p className="text-sm text-muted-foreground mt-4">Finding available labs...</p>
              </div>
            ) : availableLabs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <AlertCircle className="w-12 h-12 text-muted-foreground mb-3" />
                <h3 className="text-lg font-semibold text-secondary">No labs available</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Unfortunately, none of our partner labs currently offer this specific test.
                </p>
              </div>
            ) : (
              <div className="space-y-4 pb-4">
                {availableLabs.map((lab) => (
                  <div key={lab.id} className="p-4 rounded-2xl border border-border/50 bg-card shadow-sm flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {lab.logo_url ? (
                          <img src={lab.logo_url} alt={lab.name} className="w-10 h-10 rounded-full object-contain bg-white border" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center border">
                            <span className="font-bold text-muted-foreground text-sm">{lab.name.charAt(0)}</span>
                          </div>
                        )}
                        <div>
                          <h4 className="font-semibold text-secondary line-clamp-1">{lab.name}</h4>
                          {lab.rating && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                              <span className="text-xs font-medium text-muted-foreground">{lab.rating}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="text-base font-bold text-primary">₹{lab.testPrice}</span>
                      </div>
                    </div>
                    <Button 
                      onClick={() => selectLabAndAdd(lab)}
                      className="w-full rounded-xl"
                      variant="outline"
                    >
                      Select & Add
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>


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
