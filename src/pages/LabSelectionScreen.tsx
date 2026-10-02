import { useState, useEffect, useMemo } from "react";
import { hapticSelection } from "@/utils/haptics";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, Star, Clock, AlertCircle, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import MobileLayout from "@/components/layout/MobileLayout";
import ScreenHeader from "@/components/layout/ScreenHeader";
import BookingStepper from "@/components/BookingStepper";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useUserPincode, labServesPincode } from "@/hooks/useUserPincode";
import {
  getLabSlotDates,
  FIXED_COLLECTION_SLOTS,
  isFixedSlotBookable,
  type FixedCollectionSlot,
} from "@/lib/lab-slots";
import { useLabSlots } from "@/hooks/useLabSlots";
import { Skeleton } from "@/components/ui/skeleton";
import { formatAvailableDays, getCommonSpecializedDays } from "@/lib/test-availability";

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
  const specializedDays = useMemo(
    () => getCommonSpecializedDays(items.map((item) => ({
      availabilityType: item.availabilityType,
      availableDays: item.availableDays,
    }))),
    [items]
  );

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
  const testIsUnavailableOnDate = specializedDays !== null && !specializedDays.includes(dates[selectedDate].dayOfWeek);

  const allSlotItems = useMemo(
    () => (labIsClosedOnDate || testIsUnavailableOnDate ? [] : FIXED_COLLECTION_SLOTS),
    [labIsClosedOnDate, testIsUnavailableOnDate]
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
        const vendorProducts: Record<string, {name: string, price: number}[]> = {};
        if (vendorIds.length > 0) {
          const { data: products } = await supabase
            .from("products")
            .select("vendor_id, product_name, price")
            .in("vendor_id", vendorIds)
            .eq("availability", true);
          if (products) {
            products.forEach((p) => {
              if (!vendorProducts[p.vendor_id]) vendorProducts[p.vendor_id] = [];
              vendorProducts[p.vendor_id].push({
                name: p.product_name.trim().toLowerCase(),
                price: Number(p.price) || 0
              });
            });
          }
        }

        // Step 1: Inject vendor products into ALL labs safely
        const mappedLabs = pincodeFiltered.map((lab) => {
          const baseTests = Array.isArray(lab.available_tests) ? lab.available_tests : [];
          const additionalTests = (lab.vendor_id && vendorProducts[lab.vendor_id])
            ? vendorProducts[lab.vendor_id].map(vp => ({ test_name: vp.name, price: vp.price }))
            : [];
          
          const available_tests = [...baseTests, ...additionalTests];
          return { ...lab, available_tests };
        });

        // Step 2: Filter labs based on the fully injected available_tests
        const filteredLabs = mappedLabs.filter((lab) => {
          const labTestNames = new Set<string>();
          lab.available_tests.forEach((t: any) => {
            const name = (t.test_name || t.name || t.product_name || "").trim().toLowerCase();
            if (name) labTestNames.add(name);
          });

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
      <MobileLayout showNav={false}>
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
    items.forEach(item => {
      const cartName = item.name.trim().toLowerCase();
      const found = lab.available_tests.find((t: any) => {
        const name = (t.test_name || t.name || t.product_name || "").trim().toLowerCase();
        return name.includes(cartName) || cartName.includes(name);
      });
      if (found) {
        total += (Number(found.price) || 0) * (item.quantity || 1);
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

    const updatedCartItems = items.map(item => {
      if (hasVendorLab) return { ...item, labId, labName };
      const selectedLab = labs.find(l => l.id === labId);
      let newPrice = item.price;
      if (selectedLab && Array.isArray(selectedLab.available_tests)) {
        const cartName = item.name.trim().toLowerCase();
        const found = selectedLab.available_tests.find((t: any) => {
            const name = (t.test_name || t.name || t.product_name || "").trim().toLowerCase();
            return name.includes(cartName) || cartName.includes(name);
        });
        if (found) newPrice = Number(found.price) || 0;
      }
      return { ...item, price: newPrice, labId, labName };
    });

    if (!hasVendorLab) {
      const itemPrices: Record<string, number> = {};
      updatedCartItems.forEach(item => {
        itemPrices[item.id] = item.price;
      });
      updateLabForItems(labId, labName, itemPrices);
    }

    const selectedSlot = allSlotItems.find((s) => s.id === selectedTime);
    const finalSubtotal = hasVendorLab ? subtotal : updatedCartItems.reduce((acc, curr) => acc + curr.price * (curr.quantity || 1), 0);

    navigate("/payment", {
      state: {
        cartItems: updatedCartItems,
        scheduledDate: dates[selectedDate].fullDate,
        scheduledTimeSlot: selectedSlot?.display || selectedTime || "",
        subtotal: finalSubtotal,
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
    <MobileLayout showNav={false}>
      <ScreenHeader title="Select Lab & Slot" />
      <BookingStepper currentStep={2} />

      <div className="px-4 pb-6">
        {/* Lab Selection */}
        {!hasVendorLab && (
          <motion.div initial={false} animate={{ opacity: 1 }} className="mb-4">
            <h2 className="text-base font-bold text-foreground mb-2">Choose Your Lab</h2>
            <AnimatePresence mode="wait">
              {labsLoading ? (
                <motion.div key="loading" initial={false} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="p-4 rounded-2xl border border-border/50 bg-card space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="flex gap-3">
                          <Skeleton className="w-12 h-12 rounded-xl" />
                          <div className="space-y-2">
                            <Skeleton className="w-32 h-4" />
                            <Skeleton className="w-24 h-3" />
                          </div>
                        </div>
                        <Skeleton className="w-16 h-4" />
                      </div>
                    </div>
                  ))}
                </motion.div>
              ) : labs.length === 0 ? (
                <motion.div key="empty" initial={false} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-8">
                  <Building2 className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No labs available for your selected tests</p>
                </motion.div>
              ) : (
                <motion.div key="data" initial={false} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
                  {labs.map((lab) => {
                    const labPrice = getLabPrice(lab);
                    return (
                    <button
                      key={lab.id}
                      onClick={() => { hapticSelection(); setSelectedLabId(lab.id); setSelectedLabName(lab.name); }}
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
              </motion.div>
            )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Selected lab info for vendor lab */}
        {hasVendorLab && currentLabName && (
          <motion.div initial={false} animate={{ opacity: 1 }} className="mb-4">
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
        <motion.div initial={false} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0}}>
          <h2 className="text-base font-bold text-foreground mb-2">Select Date</h2>
          <div className="flex gap-2">
            {dates.map((date, index) => {
              const dayRow = labSlotsByDay[date.dayOfWeek];
              const isOpen = !selectedLabVendorId || slotsLoading
                ? true
                : !!dayRow?.is_open;
              const isTestDay = specializedDays === null || specializedDays.includes(date.dayOfWeek);
              const isBookableDay = isOpen && isTestDay;
              return (
                <button
                  key={date.fullDate}
                  onClick={() => { if (!isBookableDay) return; hapticSelection(); setSelectedDate(index); }}
                  disabled={!isBookableDay}
                  className={`flex-1 py-3 rounded-xl text-center transition-all ${
                    !isBookableDay
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
                    !isBookableDay ? "text-destructive" : selectedDate === index ? "text-primary-foreground/80" : "text-success"
                  }`}>
                    {!isTestDay ? "Test unavailable" : isOpen ? "Available" : "Closed"}
                  </p>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Time Selection */}
        <motion.div initial={false} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0}} className="mt-4">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">SELECT TIME SLOT</h2>

          {!selectedLabId ? (
            <p className="text-sm text-muted-foreground">Select a lab to see available time slots.</p>
          ) : !selectedLabVendorId || slotsLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading slots…
            </div>
          ) : testIsUnavailableOnDate ? (
            <div className="rounded-xl border border-border bg-muted/30 px-4 py-6 text-center">
              <Clock className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground">Specialized test unavailable on this day</p>
              <p className="text-xs text-muted-foreground mt-1">Available on {formatAvailableDays(items.find((item) => item.availabilityType === "SPECIALIZED")?.availableDays)}.</p>
            </div>
          ) : labIsClosedOnDate ? (
            <div className="rounded-xl border border-border bg-muted/30 px-4 py-6 text-center">
              <Clock className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground">Lab is closed on this day</p>
              <p className="text-xs text-muted-foreground mt-1">Please pick a different date.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* First Half — Morning slots */}
              {(() => {
                const firstHalfSlots = allSlotItems.filter((s) => s.startMinutes < 12 * 60);
                const anyAvailable = firstHalfSlots.some((s) => getSlotAvailability(s));
                return firstHalfSlots.length > 0 ? (
                  <div className={`rounded-2xl border p-3.5 transition-all ${anyAvailable ? "bg-card border-slate-200/70" : "bg-muted/20 border-transparent opacity-60"}`}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-sm font-bold text-slate-800">First Half</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200/60">Fasting available</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {firstHalfSlots.map((slot) => {
                        const isAvailable = getSlotAvailability(slot);
                        const isSelected = selectedTime === slot.id;
                        return (
                          <button
                            key={slot.id}
                            onClick={() => { if (!isAvailable) return; hapticSelection(); setSelectedTime(slot.id); }}
                            disabled={!isAvailable}
                            className={`relative px-4 py-3 rounded-xl border text-left transition-all duration-200 ${
                              !isAvailable
                                ? "bg-muted/20 border-transparent opacity-40 cursor-not-allowed"
                                : isSelected
                                ? "bg-primary/8 border-primary shadow-sm ring-1 ring-primary/30"
                                : "bg-card border-slate-200/80 hover:border-primary/40 hover:shadow-sm active:scale-[0.97]"
                            }`}
                          >
                            {isSelected && (
                              <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                                <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                              </span>
                            )}
                            <span className={`block text-[13px] font-bold leading-tight ${!isAvailable ? "text-foreground/40 line-through" : isSelected ? "text-primary" : "text-slate-800"}`}>
                              {slot.time}
                            </span>
                            {!isAvailable && (
                              <span className="block text-[9px] text-muted-foreground mt-0.5">Too late</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null;
              })()}

              {/* Second Half — Afternoon / Evening slots */}
              {(() => {
                const secondHalfSlots = allSlotItems.filter((s) => s.startMinutes >= 12 * 60);
                const anyAvailable = secondHalfSlots.some((s) => getSlotAvailability(s));
                return secondHalfSlots.length > 0 ? (
                  <div className={`rounded-2xl border p-3.5 transition-all ${anyAvailable ? "bg-card border-slate-200/70" : "bg-muted/20 border-transparent opacity-60"}`}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-sm font-bold text-slate-800">Second Half</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-50 text-orange-500 border border-orange-200/60">No fasting available</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {secondHalfSlots.map((slot) => {
                        const isAvailable = getSlotAvailability(slot);
                        const isSelected = selectedTime === slot.id;
                        return (
                          <button
                            key={slot.id}
                            onClick={() => { if (!isAvailable) return; hapticSelection(); setSelectedTime(slot.id); }}
                            disabled={!isAvailable}
                            className={`relative px-4 py-3 rounded-xl border text-left transition-all duration-200 ${
                              !isAvailable
                                ? "bg-muted/20 border-transparent opacity-40 cursor-not-allowed"
                                : isSelected
                                ? "bg-primary/8 border-primary shadow-sm ring-1 ring-primary/30"
                                : "bg-card border-slate-200/80 hover:border-primary/40 hover:shadow-sm active:scale-[0.97]"
                            }`}
                          >
                            {isSelected && (
                              <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                                <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                              </span>
                            )}
                            <span className={`block text-[13px] font-bold leading-tight ${!isAvailable ? "text-foreground/40 line-through" : isSelected ? "text-primary" : "text-slate-800"}`}>
                              {slot.time}
                            </span>
                            {!isAvailable && (
                              <span className="block text-[9px] text-muted-foreground mt-0.5">Too late</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null;
              })()}

              {allSlotItems.every((slot) => !getSlotAvailability(slot)) && (
                <p className="text-xs text-muted-foreground pt-1">
                  All of today's slots have passed. Please book for tomorrow.
                </p>
              )}
            </div>
          )}

        </motion.div>
        {/* Confirm Button (Moved Inline) */}
        <motion.div 
          initial={false} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0}}
          className="mt-6 w-full bg-card rounded-2xl border border-border/70 p-3 shadow-sm mb-4"
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
        </motion.div>

      </div>
    </MobileLayout>
  );
};

export default LabSelectionScreen;
