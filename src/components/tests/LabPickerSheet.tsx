import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import LoadingSpinner from "@/components/ui/loading-spinner";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { useUserPincode, labServesPincode } from "@/hooks/useUserPincode";

/** The test being added. `name` must be the catalogue name: labs are matched on it. */
export interface LabPickerTest {
  id: string;
  name: string;
  price: number;
  category?: string;
  availabilityType?: "GENERAL" | "SPECIALIZED";
  availableDays?: string[];
  sampleType?: string;
  preparationRequired?: boolean;
  preparationInstruction?: string;
  fastingRequired?: boolean;
  fastingInstruction?: string;
  reportType?: string;
}

/**
 * Labs near the user (by pincode) that offer this test, with each lab's own price.
 * A lab offers a test when its available_tests list, or its vendor's live products,
 * contain the test name (exact match preferred, then partial).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchLabsForTest(test: LabPickerTest, pincode: string | null): Promise<any[]> {
  const { data, error } = await supabase
    .from("diagnostic_centers")
    .select("*")
    .order("rating", { ascending: false });

  if (error || !data) throw error;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pincodeFiltered = data.filter((d) => labServesPincode(d as any, pincode));

  const vendorIds = pincodeFiltered.filter((d) => d.vendor_id).map((d) => d.vendor_id!);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
            availableDays: p.available_days,
            sampleType: p.sample_type,
            preparationRequired: p.preparation_required,
            preparationInstruction: p.preparation_instruction,
            fastingRequired: p.fasting_required,
            fastingInstruction: p.fasting_instruction,
            reportType: p.report_type,
          });
        }
      });
    }
  }

  const targetTestName = test.name.trim().toLowerCase();

  return pincodeFiltered
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((lab: any) => {
      // Lab-specific pricing map: { "Test Name": price }
      const labPricing: Record<string, number> = {};
      if (lab.pricing && typeof lab.pricing === "object" && !Array.isArray(lab.pricing)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const [k, v] of Object.entries(lab.pricing as Record<string, any>)) {
          const key = String(k).trim().toLowerCase();
          const val = Number(v);
          if (key && Number.isFinite(val) && val > 0) labPricing[key] = val;
        }
      }

      const baseTests = Array.isArray(lab.available_tests) ? lab.available_tests : [];
      const additionalTests =
        lab.vendor_id && vendorProducts[lab.vendor_id]
          ? vendorProducts[lab.vendor_id].map((vp) => ({ test_name: vp.name, ...vp }))
          : [];

      const allTests = [...baseTests, ...additionalTests];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const nameOf = (t: any) =>
        String(typeof t === "string" ? t : t.test_name || t.name || t.product_name || "")
          .trim()
          .toLowerCase();

      // Prefer an exact name match, then fall back to a partial match
      const matchingTest =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        allTests.find((t: any) => nameOf(t) === targetTestName) ??
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        (typeof matchingTest === "string" ? undefined : Number(matchingTest.price) || undefined);

      return {
        ...lab,
        testPrice: labPrice && labPrice > 0 ? labPrice : Number(test.price) || 0,
        productMetadata: typeof matchingTest === "string" ? null : matchingTest,
      };
    })
    .filter(Boolean);
}

interface LabPickerSheetProps {
  test: LabPickerTest | null;
  onClose: () => void;
}

/**
 * "Select a Lab" bottom sheet: the one way a test gets into the cart, from the test
 * page and from every test list. Shows "No labs available" when no nearby lab offers
 * the test; picking a lab adds it at that lab's price and opens the lab.
 */
const LabPickerSheet = ({ test, onClose }: LabPickerSheetProps) => {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { pincode } = useUserPincode();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [availableLabs, setAvailableLabs] = useState<any[]>([]);
  const [fetchingLabs, setFetchingLabs] = useState(false);

  useEffect(() => {
    if (!test) return;
    let cancelled = false;
    setAvailableLabs([]);
    setFetchingLabs(true);
    fetchLabsForTest(test, pincode)
      .then((labs) => {
        if (!cancelled) setAvailableLabs(labs);
      })
      .catch((e) => {
        console.error(e);
        if (!cancelled) toast.error("Failed to fetch labs");
      })
      .finally(() => {
        if (!cancelled) setFetchingLabs(false);
      });
    return () => {
      cancelled = true;
    };
  }, [test, pincode]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      onClose();
      toast.success(`${test.name} added from ${lab.name}`);
      navigate(`/lab/${lab.id}`);
    }
  };

  return (
    <Sheet open={!!test} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="rounded-t-3xl min-h-[400px] max-h-[85vh] flex flex-col p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/40">
          <SheetTitle className="text-xl">Select a Lab</SheetTitle>
          <SheetDescription>Choose a lab that provides this test to continue</SheetDescription>
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
                        <img src={lab.logo_url} alt={lab.name} loading="lazy" decoding="async" className="w-10 h-10 rounded-full object-contain bg-white border" />
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
                  <Button onClick={() => selectLabAndAdd(lab)} className="w-full rounded-xl" variant="outline">
                    Select & Add
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default LabPickerSheet;
