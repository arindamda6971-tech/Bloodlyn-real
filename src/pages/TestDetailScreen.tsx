import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  CalendarCheck,
  CalendarDays,
  Check,
  ChevronRight,
  Clock,
  Droplet,
  FileText,
  FlaskConical,
  Home,
  ShieldCheck,
  ShoppingCart,
  Utensils,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import MobileLayout from "@/components/layout/MobileLayout";
import ScreenHeader from "@/components/layout/ScreenHeader";
import LoadingSpinner from "@/components/ui/loading-spinner";
import { LabAvatar, LabOpenBadge, LabRating } from "@/components/labs/lab-display";
import { TestFacts } from "@/components/tests/TestFacts";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCart } from "@/contexts/CartContext";
import { useUserPincode, labServesPincode } from "@/hooks/useUserPincode";
import { useBridgeTests } from "@/hooks/useBridgeTests";
import { formatRupees, prettyGroupName } from "@/lib/health-packages";
import { beforeYouBook, reportTimeValue, testFacts, type TestFactKey } from "@/lib/test-page";
import { clinicalNameAddsDetail, testNameParts } from "@/utils/simplify-test-name";

interface UnifiedTest {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  reportTime?: string;
  fastingRequired?: boolean;
  fastingHours?: number;
  description?: string | null;
  prerequisites?: string | null;
  category?: string;
  availabilityType?: "GENERAL" | "SPECIALIZED";
  availableDays?: string[];
  sampleType?: string;
  preparationRequired?: boolean;
  preparationInstruction?: string;
  fastingInstruction?: string;
  reportType?: string;
  prescriptionRequired?: boolean;
}

/** A test handed over by the screen that opened this one: a catalogue test, or a lab's own test. */
const fromBridgeTest = (t: any): UnifiedTest => ({
  id: t.id,
  name: t.test_name || t.name,
  price: t.price > 0 ? t.price : t.collection_fee || 0,
  reportTime: t.report_delivery_time || t.reportTime,
  description: t.description,
  prerequisites: t.prerequisites,
  category: t.category,
  availabilityType: t.availabilityType,
  availableDays: t.availableDays,
  sampleType: t.sampleType,
  preparationRequired: t.preparationRequired,
  preparationInstruction: t.preparationInstruction,
  fastingRequired: t.fastingRequired,
  fastingInstruction: t.fastingInstruction,
  reportType: t.reportType,
  prescriptionRequired: t.prescriptionRequired,
});

const FACT_ICONS: Record<TestFactKey, LucideIcon> = {
  preparation: Utensils,
  report: Clock,
  sample: Droplet,
  days: CalendarDays,
  reportType: ShieldCheck,
};

const TestDetailScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const { addToCart, items, pendingItem, confirmReplace, cancelReplace, hasItem } = useCart();
  const { pincode } = useUserPincode();
  const { data: bridgeData } = useBridgeTests();

  const bridgeTest = (location.state as any)?.bridgeTest;
  /** Set when the test was opened from a lab's page: its details and price are that lab's. */
  const preselectedLab = (location.state as any)?.preselectedLab as
    | { id: string; name: string; vendor_id?: string | null; productPrice?: number }
    | undefined;
  const [test, setTest] = useState<UnifiedTest | null>(() => (bridgeTest ? fromBridgeTest(bridgeTest) : null));
  const [loading, setLoading] = useState(!bridgeTest);
  const [error, setError] = useState<string | null>(null);
  const [showLabSheet, setShowLabSheet] = useState(false);
  const [fetchingLabs, setFetchingLabs] = useState(false);
  const [availableLabs, setAvailableLabs] = useState<any[]>([]);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    // If state already has the correct test, we're done. This comes first: setting
    // the test again below would rerun this effect forever and freeze the app.
    if (test && (test.id === id || test.name.toLowerCase() === id.toLowerCase())) {
      setLoading(false);
      return;
    }

    // If location state provides the new test, use it
    if (bridgeTest && (bridgeTest.id === id || (bridgeTest as any).slug === id || (bridgeTest.test_name || bridgeTest.name)?.toLowerCase() === id.toLowerCase())) {
      setTest(fromBridgeTest(bridgeTest));
      setLoading(false);
      return;
    }

    // Otherwise, clear stale state and fetch
    setLoading(true);
    setTest(null);
    setError(null);

    (async () => {
      try {
        const { data } = await supabase.from("tests").select("*").eq("id", id).maybeSingle();
        if (data) {
          setTest({
            id: data.id,
            name: data.name,
            price: data.price,
            originalPrice: data.original_price || undefined,
            reportTime: data.report_time_hours ? String(data.report_time_hours) : undefined,
            fastingRequired: data.fasting_required ?? undefined,
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
            setTest(fromBridgeTest(match));
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

  const isInCart = useMemo(() => !!test && hasItem(test.id, test.name), [items, test, hasItem]); // eslint-disable-line react-hooks/exhaustive-deps

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
      const vendorProducts: Record<string, any[]> = {};
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
                price: Number(p.price) || 0,
                availabilityType: p.availability_type,
                prescriptionRequired: p.prescription_required === true,
                availableDays: p.available_days,
                sampleType: p.sample_type,
                preparationRequired: p.preparation_required,
                preparationInstruction: p.preparation_instruction,
                fastingRequired: p.fasting_required,
                fastingInstruction: p.fasting_instruction,
                reportType: p.report_type,
                reportTime: (p as { report_time?: string | null }).report_time || undefined,
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
          ? vendorProducts[lab.vendor_id].map(vp => ({ test_name: vp.name, ...vp }))
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
          productMetadata: typeof matchingTest === "string" ? null : matchingTest,
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

  const openLabSheet = () => {
    setShowLabSheet(true);
    fetchLabsForTest();
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
      availabilityType: lab.productMetadata?.availabilityType || test.availabilityType,
      availableDays: lab.productMetadata?.availableDays || test.availableDays,
      sampleType: lab.productMetadata?.sampleType || test.sampleType,
      preparationRequired: lab.productMetadata?.preparationRequired ?? test.preparationRequired,
      preparationInstruction: lab.productMetadata?.preparationInstruction || test.preparationInstruction,
      fastingRequired: lab.productMetadata?.fastingRequired ?? test.fastingRequired,
      fastingInstruction: lab.productMetadata?.fastingInstruction || test.fastingInstruction,
      reportType: lab.productMetadata?.reportType || test.reportType,
    });

    if (ok) {
      setShowLabSheet(false);
      toast.success(`${test.name} added from ${lab.name}`);
      navigate(`/lab/${lab.id}`);
    }
  };

  /** From a lab's page the lab is already chosen, so the test goes straight in. */
  const addFromPreselectedLab = () => {
    if (!test || !preselectedLab) return;
    const ok = addToCart({
      id: test.id,
      name: test.name,
      price: Number(preselectedLab.productPrice ?? test.price) || 0,
      labId: preselectedLab.id,
      labName: preselectedLab.name,
      vendorId: preselectedLab.vendor_id || undefined,
      category: test.category,
      kind: "test",
      availabilityType: test.availabilityType,
      availableDays: test.availableDays,
      sampleType: test.sampleType,
      preparationRequired: test.preparationRequired,
      preparationInstruction: test.preparationInstruction,
      fastingRequired: test.fastingRequired,
      fastingInstruction: test.fastingInstruction,
      reportType: test.reportType,
    });
    if (ok) toast.success(`${testNameParts(test.name).title} added to cart`);
  };

  if (loading) {
    return (
      <MobileLayout showFloatingAdd={false} showNav={false}>
        <ScreenHeader title="Test Details" />
        <div className="flex items-center justify-center h-[60vh]">
          <LoadingSpinner size="lg" />
        </div>
      </MobileLayout>
    );
  }

  if (error || !test) {
    return (
      <MobileLayout showFloatingAdd={false} showNav={false}>
        <ScreenHeader title="Test Details" />
        <div className="flex flex-col items-center justify-center h-[60vh] px-6 text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold mb-2">{error || "Test not found"}</h2>
          <Button onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </MobileLayout>
    );
  }

  const { title } = testNameParts(test.name);
  const category = test.category?.trim() ? prettyGroupName(test.category) : null;
  const price = preselectedLab ? Number(preselectedLab.productPrice ?? test.price) || 0 : null;
  const facts = testFacts(test);
  const notes = beforeYouBook(test);
  const about = test.description?.trim();
  const reportIn = reportTimeValue(test.reportTime);

  const steps = [
    { icon: CalendarCheck, title: "Book a slot", text: "Pick a date and time" },
    { icon: Home, title: "Sample at home", text: "Collected at your address" },
    { icon: FileText, title: "Get your report", text: reportIn ? `In the app within ${reportIn}` : "In the app when ready" },
  ];

  return (
    <MobileLayout showFloatingAdd={false} showNav={false}>
      <ScreenHeader title="Test Details" />

      <div className="pb-36">
        {/* Summary */}
        <section className="px-4 pt-4">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/15 via-primary/5 to-background border border-primary/10 p-5">
            <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-primary/10 pointer-events-none" />
            <div className="relative flex items-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center shrink-0">
                <FlaskConical className="w-6 h-6 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                {category && (
                  <span className="inline-block mb-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white text-primary">
                    {category}
                  </span>
                )}
                <h1 className="text-[22px] font-black text-foreground leading-tight break-words">{title}</h1>
                {clinicalNameAddsDetail(test.name) && (
                  <p className="mt-1 text-[11px] text-muted-foreground leading-snug break-words">{test.name}</p>
                )}
                {preselectedLab && <p className="mt-1 text-xs font-semibold text-muted-foreground">by {preselectedLab.name}</p>}
              </div>
            </div>

            {about && <p className="relative mt-3 text-sm text-muted-foreground leading-relaxed">{about}</p>}

            <div className="relative mt-4">
              {price !== null ? (
                <span className="text-3xl font-black text-foreground">{formatRupees(price)}</span>
              ) : (
                <p className="text-sm font-semibold text-foreground">
                  Each lab sets its own price.{" "}
                  <span className="font-normal text-muted-foreground">Compare the labs near you before booking.</span>
                </p>
              )}
            </div>
          </div>

          {facts.length > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {facts.map((f) => {
                const Icon = FACT_ICONS[f.key];
                return (
                  <div key={f.key} className="flex items-center gap-2.5 rounded-2xl bg-white border border-border/50 px-3 py-2.5">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{f.label}</p>
                      <p className="text-[13px] font-extrabold text-foreground truncate">{f.value}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* How it works */}
        <section className="px-4 mt-7">
          <h2 className="text-lg font-extrabold text-foreground">How it works</h2>
          <ol className="mt-3 grid grid-cols-3 gap-2">
            {steps.map((step, i) => (
              <li key={step.title} className="rounded-2xl bg-white border border-border/50 p-3 text-center">
                <div className="mx-auto w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                  <step.icon className="w-4 h-4 text-primary" />
                </div>
                <p className="mt-2 text-[10px] font-bold text-muted-foreground">STEP {i + 1}</p>
                <p className="text-[12px] font-extrabold text-foreground leading-tight">{step.title}</p>
                <p className="mt-0.5 text-[10.5px] text-muted-foreground leading-snug">{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Before you book: only what the lab wrote */}
        {notes.length > 0 && (
          <section className="px-4 mt-7">
            <h2 className="text-lg font-extrabold text-foreground">Before you book</h2>
            <div className="mt-3 rounded-2xl bg-amber-50/70 border border-amber-200/60 p-4 space-y-3">
              {notes.map((note) => (
                <p key={note.key} className="flex items-start gap-3 text-sm text-foreground">
                  {note.key === "prescription" ? (
                    <FileText className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
                  ) : (
                    <Utensils className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
                  )}
                  <span className="whitespace-pre-line">{note.text}</span>
                </p>
              ))}
            </div>
          </section>
        )}

        {/* Lab */}
        {preselectedLab ? (
          <section className="px-4 mt-7">
            <h2 className="text-lg font-extrabold text-foreground">Offered by</h2>
            <button
              type="button"
              onClick={() => navigate(`/lab/${preselectedLab.id}`)}
              className="mt-3 w-full flex items-center gap-3 rounded-2xl border border-border/60 bg-white p-3 text-left"
            >
              <LabAvatar name={preselectedLab.name} className="w-12 h-12 rounded-xl" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-extrabold text-foreground truncate">{preselectedLab.name}</p>
                <div className="mt-1 flex items-center gap-2 flex-wrap">
                  <LabOpenBadge vendorId={preselectedLab.vendor_id ?? null} />
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </button>
          </section>
        ) : (
          <section className="px-4 mt-7">
            <h2 className="text-lg font-extrabold text-foreground">Where to book</h2>
            <button
              type="button"
              onClick={openLabSheet}
              className="mt-3 w-full flex items-center gap-3 rounded-2xl border border-border/60 bg-white p-3 text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <FlaskConical className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-extrabold text-foreground">See labs near you</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Price, preparation and report time from each lab{pincode ? ` · ${pincode}` : ""}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </button>
          </section>
        )}
      </div>

      {/* Book bar */}
      <div
        className="fixed bottom-0 left-0 right-0 w-full md:max-w-[430px] mx-auto bg-background/95 backdrop-blur-md border-t border-border/40 px-4 pt-3 z-40 flex items-center gap-3"
        style={{ paddingBottom: "max(var(--sab), 12px)" }}
      >
        <div className="min-w-0">
          {price !== null ? (
            <>
              <span className="text-lg font-black text-foreground leading-none">{formatRupees(price)}</span>
              <p className="text-[11px] mt-1 truncate font-semibold text-muted-foreground">{preselectedLab?.name}</p>
            </>
          ) : (
            <>
              <p className="text-sm font-black text-foreground leading-none">Price by lab</p>
              <p className="text-[11px] mt-1 truncate font-semibold text-muted-foreground">Choose a lab to book</p>
            </>
          )}
        </div>
        <Button
          className="ml-auto h-12 rounded-full px-6 text-base font-semibold gap-2"
          onClick={isInCart ? () => navigate("/cart") : preselectedLab ? addFromPreselectedLab : openLabSheet}
          variant={isInCart ? "softSuccess" : "default"}
        >
          {isInCart ? <Check className="w-5 h-5" /> : <ShoppingCart className="w-5 h-5" />}
          {isInCart ? "View cart" : preselectedLab ? "Add to cart" : "Choose lab"}
        </Button>
      </div>

      {/* Lab Selection Sheet */}
      <Sheet open={showLabSheet} onOpenChange={setShowLabSheet}>
        <SheetContent side="bottom" className="rounded-t-3xl min-h-[400px] max-h-[85vh] flex flex-col p-0">
          <SheetHeader className="px-5 pt-6 pb-4 border-b border-border/40 text-left">
            <SheetTitle className="text-lg">Labs near you</SheetTitle>
            <SheetDescription>
              {pincode ? `Labs that collect at ${pincode} and offer ${title}` : `Labs that offer ${title}`}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-4">
            {fetchingLabs ? (
              <div className="flex flex-col items-center justify-center py-10">
                <LoadingSpinner size="md" />
                <p className="text-sm text-muted-foreground mt-4">Finding labs...</p>
              </div>
            ) : availableLabs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <AlertCircle className="w-12 h-12 text-muted-foreground mb-3" />
                <h3 className="text-lg font-semibold text-foreground">No labs yet</h3>
                <p className="text-sm text-muted-foreground mt-1">None of the labs near you offer this test right now.</p>
              </div>
            ) : (
              <div className="space-y-3 pb-4">
                {availableLabs.map((lab) => (
                  <div key={lab.id} className="rounded-2xl border border-border/60 bg-white p-3.5">
                    <div className="flex items-start gap-3">
                      <LabAvatar name={lab.name} logoUrl={lab.logo_url} className="w-11 h-11 rounded-xl" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-extrabold text-foreground line-clamp-1">{lab.name}</p>
                          <span className="text-base font-black text-foreground shrink-0">{formatRupees(lab.testPrice)}</span>
                        </div>
                        <div className="mt-0.5">
                          <LabRating rating={lab.rating ?? null} reviews={lab.reviews_count ?? 0} />
                        </div>
                        {lab.productMetadata && <TestFacts test={lab.productMetadata} withInstructions className="mt-1.5" />}
                      </div>
                    </div>
                    <Button onClick={() => selectLabAndAdd(lab)} className="mt-3 w-full h-10 rounded-full text-[13px] font-semibold">
                      Book from this lab
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <AnimatePresence>
        {pendingItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-end"
          >
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="w-full bg-background rounded-t-3xl p-6 shadow-2xl"
              style={{ paddingBottom: "max(var(--sab), 24px)" }}
            >
              <div className="w-12 h-1 bg-muted rounded-full mx-auto mb-4" />
              <h3 className="font-bold text-lg text-foreground mb-2">Replace your cart?</h3>
              <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                Your cart has tests from <span className="font-semibold text-foreground">{pendingItem.existingLabName}</span>. One booking can only be from one lab.
              </p>
              <div className="flex flex-col gap-2">
                <Button
                  className="w-full"
                  onClick={() => {
                    confirmReplace();
                    toast.success("Cart replaced");
                  }}
                >
                  Replace with this test
                </Button>
                <Button variant="outline" className="w-full" onClick={cancelReplace}>
                  Keep my current cart
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </MobileLayout>
  );
};

export default TestDetailScreen;
