import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Building2, Star, Clock, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import MobileLayout from "@/components/layout/MobileLayout";
import ScreenHeader from "@/components/layout/ScreenHeader";
import BookingStepper from "@/components/BookingStepper";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useUserPincode, labServesPincode } from "@/hooks/useUserPincode";
import { getLabSlotDates, isSameDaySlotBookable, type SlotItem, toSortedSlotItems } from "@/lib/lab-slots";
import { useLabSlots } from "@/hooks/useLabSlots";

interface PatientState {
  patientName?: string;
  patientAge?: number | string | null;
  patientGender?: string;
  patientPhone?: string;
  contactPhone?: string;
  addressId?: string | null;
  hasVendorLab?: boolean;
  labVendorId?: string | null;
}

interface DiagnosticCenter {
  id: string;
  name: string;
  rating: number | null;
  reviews_count: number | null;
  home_collection_available: boolean | null;
  vendor_id: string | null;
  opening_time: string | null;
  closing_time: string | null;
  available_tests: any;
}

const LabSelectionScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const patientState = (location.state as PatientState) || {};
  const { items, updateLabForItems, subtotal, currentLabId, currentLabName } = useCart();

  const hasVendorLab = patientState.hasVendorLab || !!(currentLabId && currentLabName);

  const [selectedLabId, setSelectedLabId] = useState<string | null>(hasVendorLab ? currentLabId : null);
  const [selectedLabName, setSelectedLabName] = useState<string | null>(hasVendorLab ? currentLabName : null);
  const [selectedLabVendorId, setSelectedLabVendorId] = useState<string | null>(
    hasVendorLab ? (patientState.labVendorId || items.find((item) => item.labId === currentLabId)?.vendorId || null) : null
  );
  const [selectedDate, setSelectedDate] = useState(0);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const [labs, setLabs] = useState<DiagnosticCenter[]>([]);
  const [labsLoading, setLabsLoading] = useState(!hasVendorLab);

  // Only today, tomorrow and the day after tomorrow are bookable.
  const dates = useMemo(() => getLabSlotDates(3), []);

  // Resolve selected lab's vendor_id (lab_user_id in Partner project)
  useEffect(() => {
    // Reset stale slot selection immediately when switching labs
    setSelectedTime(null);
    if (!selectedLabId) {
      setSelectedLabVendorId(null);
      return;
    }
    setSelectedLabVendorId(null);
    const known = labs.find((l) => l.id === selectedLabId);
    if (known?.vendor_id) {
      setSelectedLabVendorId(known.vendor_id);
      return;
    }
    const cartVendorId = items.find((item) => item.labId === selectedLabId)?.vendorId;
    if (cartVendorId) {
      setSelectedLabVendorId(cartVendorId);
      return;
    }
    // Vendor-lab flow: lab isn't in `labs` array — fetch vendor_id from diagnostic_centers
    let cancelled = false;
    supabase
      .from("diagnostic_centers")
      .select("vendor_id")
      .eq("id", selectedLabId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setSelectedLabVendorId((data?.vendor_id as string) ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedLabId, labs, items]);

  // Real schedule straight from the Partner dashboard (lab_time_slots).
  const isGenericService = selectedLabVendorId === "generic-service";
  const {
    data: labSlots,
    isLoading: slotsQueryLoading,
  } = useLabSlots(isGenericService ? null : selectedLabVendorId);

  const labSlotsByDay = useMemo(() => {
    if (isGenericService) {
      const map: Record<number, { is_open: boolean; slots: string[] }> = {};
      for (let i = 0; i <= 6; i++) map[i] = { is_open: true, slots: [] };
      return map;
    }
    return labSlots?.byDay ?? {};
  }, [isGenericService, labSlots]);

  const slotsLoading = !isGenericService && slotsQueryLoading;

  // The Partner dashboard only decides whether the lab is OPEN on a given day.
  // The collection windows themselves are fixed across the whole app.
  const activeDayRow = labSlotsByDay[dates[selectedDate].dayOfWeek];
  const labIsClosedOnDate =
    !!selectedLabVendorId && !slotsLoading && (!activeDayRow || !activeDayRow.is_open);

  const allSlotItems = useMemo(
    () => (labIsClosedOnDate ? [] : FIXED_COLLECTION_SLOTS),
    [labIsClosedOnDate]
  );

  const getSlotAvailability = (slot: FixedCollectionSlot) =>
    isFixedSlotBookable(slot, selectedDate);




  const { pincode: userPincode } = useUserPincode();

  useEffect(() => {
    if (hasVendorLab) return;

    const fetchLabs = async () => {
      try {
        // Fetch diagnostic centers (request * so service_pincodes column flows through if Partner exposed it)
        const { data, error } = await supabase
          .from("diagnostic_centers")
          .select("*")
          .order("rating", { ascending: false });

        if (error || !data) { setLabsLoading(false); return; }

        // Restrict to labs that serve the user's pincode (Zomato-style)
        const pincodeFiltered = data.filter((d) => labServesPincode(d as any, userPincode));

        const cartTestNames = items.map(item => item.name.trim().toLowerCase());

        // Also fetch products for all vendor_ids to cross-match
        const vendorIds = pincodeFiltered.filter(d => d.vendor_id).map(d => d.vendor_id!);
        const vendorProducts: Record<string, string[]> = {};
        if (vendorIds.length > 0) {
          const { data: products } = await supabase
            .from("products")
            .select("vendor_id, product_name")
            .in("vendor_id", vendorIds)
            .eq("availability", true);
          if (products) {
            products.forEach((p) => {
              if (!vendorProducts[p.vendor_id]) vendorProducts[p.vendor_id] = [];
              vendorProducts[p.vendor_id].push(p.product_name.trim().toLowerCase());
            });
          }
        }

        const filteredLabs = pincodeFiltered.filter((lab) => {
          // Collect all test names from available_tests JSONB
          const labTestNames = new Set<string>();
          if (Array.isArray(lab.available_tests)) {
            lab.available_tests.forEach((t: any) => {
              const name = (t.test_name || t.name || t.product_name || "").trim().toLowerCase();
              if (name) labTestNames.add(name);
            });
          }
          // Also add from products table
          if (lab.vendor_id && vendorProducts[lab.vendor_id]) {
            vendorProducts[lab.vendor_id].forEach(n => labTestNames.add(n));
          }

          if (labTestNames.size === 0) return false;

          // Check that ALL cart items match at least one lab test
          return cartTestNames.every(cartName =>
            Array.from(labTestNames).some(labName =>
              labName.includes(cartName) || cartName.includes(labName)
            )
          );
        });

        setLabs(filteredLabs);
      } catch (err) {
        console.error("Error fetching labs:", err);
      } finally {
        setLabsLoading(false);
      }
    };
    fetchLabs();
  }, [hasVendorLab, items, userPincode]);

  useEffect(() => {
    if (items.length === 0) navigate("/cart");
  }, [items, navigate]);

  // Reset a stale slot pick whenever the date or the lab changes.
  useEffect(() => {
    setSelectedTime(null);
  }, [selectedDate, selectedLabVendorId]);

  if (items.length === 0) {
    return (
      <MobileLayout>
        <ScreenHeader title="Select Lab & Slot" />
        <div className="flex flex-col items-center justify-center h-[60vh] px-4 text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-2">No items in cart</h2>
          <Button onClick={() => navigate("/cart")}>Back to Cart</Button>
        </div>
      </MobileLayout>
    );
  }

  const getLabPrice = (lab: DiagnosticCenter): number => {
    if (!lab.available_tests || !Array.isArray(lab.available_tests)) return 0;
    let total = 0;
    const cartTestNames = items.map(item => item.name.toLowerCase());
    cartTestNames.forEach(cartName => {
      const found = lab.available_tests.find((t: any) => {
        const name = (t.test_name || t.name || t.product_name || "").toLowerCase();
        return name.includes(cartName) || cartName.includes(name);
      });
      if (found) {
        total += Number(found.price) || 0;
      }
    });
    return total;
  };

  // Get price for the currently selected lab (for vendor lab too)
  const getSelectedLabPrice = (): number | null => {
    if (hasVendorLab) {
      // For vendor labs, use the cart subtotal
      return subtotal;
    }
    if (selectedLabId) {
      const lab = labs.find(l => l.id === selectedLabId);
      if (lab) return getLabPrice(lab);
    }
    return null;
  };

  const handleConfirm = () => {
    if (!hasVendorLab && (!selectedLabId || !selectedLabName)) {
      toast.error("Please select a lab"); return;
    }
    if (selectedTime === null) { toast.error("Please select a time slot"); return; }

    const labId = selectedLabId || currentLabId || "";
    const labName = selectedLabName || currentLabName || "";

    if (!hasVendorLab) {
      updateLabForItems(labId, labName);
    }

    const selectedSlot = allSlotItems.find((s) => s.id === selectedTime);

    navigate("/payment", {
      state: {
        cartItems: items.map(item => ({ ...item, labId, labName })),
        scheduledDate: dates[selectedDate].fullDate,
        scheduledTimeSlot: selectedSlot?.time || selectedTime || "",
        subtotal,
        selectedLabName: labName,
        selectedLabId: labId,
        labVendorId: selectedLabVendorId,
        addressId: patientState.addressId,
        ...patientState,
      },
    });
  };

  const selectedLabPrice = getSelectedLabPrice();

  return (
    <MobileLayout>
      <ScreenHeader title="Select Lab & Slot" />
      <BookingStepper currentStep={2} />

      <div className="px-4 pb-32">
        {/* Lab Selection */}
        {!hasVendorLab && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6">
            <h2 className="text-base font-bold text-foreground mb-3">Choose Your Lab</h2>
            {labsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : labs.length === 0 ? (
              <div className="text-center py-8">
                <Building2 className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No labs available for your selected tests</p>
              </div>
            ) : (
              <div className="space-y-2">
                {labs.map((lab) => {
                  const labPrice = getLabPrice(lab);
                  return (
                    <button
                      key={lab.id}
                      onClick={() => { setSelectedLabId(lab.id); setSelectedLabName(lab.name); }}
                      className={`w-full bg-card rounded-xl border p-3 flex items-center gap-3 transition-all text-left ${
                        selectedLabId === lab.id ? "ring-2 ring-primary border-primary" : "border-border hover:border-primary/40"
                      }`}
                    >
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground text-sm truncate">{lab.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <Star className="w-3 h-3 text-warning fill-warning" />
                          <span>{lab.rating || 4.5}</span>
                        </div>
                      </div>
                      {labPrice > 0 && (
                        <div className="text-right flex-shrink-0">
                          <p className="font-bold text-primary text-sm">₹{labPrice}</p>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* Selected lab info for vendor lab */}
        {hasVendorLab && currentLabName && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6">
            <div className="bg-card rounded-xl border border-primary/30 p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Selected Lab</p>
                <p className="font-semibold text-foreground text-sm truncate">{currentLabName}</p>
              </div>
              {selectedLabPrice !== null && selectedLabPrice > 0 && (
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-primary text-sm">₹{selectedLabPrice}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Date Selection */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <h2 className="text-base font-bold text-foreground mb-3">Select Date</h2>
          <div className="flex gap-2">
            {dates.map((date, index) => {
              const dayRow = labSlotsByDay[date.dayOfWeek];
              const isOpen = !selectedLabVendorId || slotsLoading
                ? true
                : !!dayRow?.is_open && dayRow.slots.length > 0;
              return (
                <button
                  key={date.fullDate}
                  onClick={() => isOpen && setSelectedDate(index)}
                  disabled={!isOpen}
                  className={`flex-1 py-3 rounded-xl text-center transition-all ${
                    !isOpen
                      ? "bg-muted/50 text-muted-foreground opacity-60"
                      : selectedDate === index
                      ? "bg-primary text-primary-foreground"
                      : "bg-card border border-border text-foreground"
                  }`}
                >
                  <p className="text-xs font-bold">{date.date} {date.month}</p>
                  <p className="text-[10px] mt-0.5">
                    {index === 0 ? "Today" : index === 1 ? "Tomorrow" : date.day}
                  </p>
                  <p className={`text-[9px] mt-0.5 ${
                    !isOpen ? "text-destructive" : selectedDate === index ? "text-primary-foreground/80" : "text-success"
                  }`}>
                    {isOpen ? "Available" : "Closed"}
                  </p>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Time Selection */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-6">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">SELECT TIME SLOT</h2>

          {!selectedLabId ? (
            <p className="text-sm text-muted-foreground">Select a lab to see available time slots.</p>
          ) : !selectedLabVendorId || slotsLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading slots…
            </div>
          ) : labIsClosedOnDate ? (
            <div className="rounded-xl border border-border bg-muted/30 px-4 py-6 text-center">
              <Clock className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground">Lab is closed on this day</p>
              <p className="text-xs text-muted-foreground mt-1">Please pick a different date.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {(["Morning", "Afternoon", "Evening", "Overnight"] as const).map((bucket) => {
                const bucketSlots = allSlotItems.filter((s) => s.label === bucket);
                if (bucketSlots.length === 0) return null;
                return (
                  <div key={bucket}>
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                      {bucket}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {bucketSlots.map((slot) => {
                        const isAvailable = getSlotAvailability(slot);
                        const isSelected = selectedTime === slot.id;
                        return (
                          <button
                            key={slot.id}
                            onClick={() => isAvailable && setSelectedTime(slot.id)}
                            disabled={!isAvailable}
                            className={`p-3 rounded-2xl border transition-all flex items-center gap-2.5 text-left ${
                              !isAvailable
                                ? "bg-muted/30 border-transparent opacity-50 cursor-not-allowed"
                                : isSelected
                                ? "bg-primary/5 border-primary shadow-sm"
                                : "bg-card border-slate-200/80 hover:border-primary/40"
                            }`}
                          >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${!isAvailable ? "bg-muted/50" : isSelected ? "bg-primary text-white" : "bg-slate-100/90 text-slate-600"}`}>
                              <Clock className="w-4 h-4" strokeWidth={2} />
                            </div>
                            <div className="min-w-0">
                              <span className={`block text-[13px] font-bold truncate ${!isAvailable ? "text-foreground/50 line-through" : "text-slate-800"}`}>
                                {slot.time}
                              </span>
                              {!isAvailable && (
                                <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                                  Passed
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {allSlotItems.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No slots published by this lab for the selected date.
                </p>
              )}
            </div>
          )}
        </motion.div>
      </div>

      {/* Confirm Button */}
      <div
        className="fixed left-0 right-0 w-full md:max-w-[430px] mx-auto bg-card border-t border-border px-4 py-3 safe-area-bottom z-40"
        style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 72px)' }}
      >
        <Button
          variant="hero"
          className="w-full"
          size="lg"
          disabled={(!hasVendorLab && !selectedLabId) || selectedTime === null}
          onClick={handleConfirm}
        >
          Confirm
        </Button>
      </div>
    </MobileLayout>
  );
};

export default LabSelectionScreen;
