import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Building2, Star, Clock, AlertCircle, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import MobileLayout from "@/components/layout/MobileLayout";
import ScreenHeader from "@/components/layout/ScreenHeader";
import BookingStepper from "@/components/BookingStepper";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useUserPincode, labServesPincode } from "@/hooks/useUserPincode";

interface PatientState {
  patientName?: string;
  patientAge?: number | string | null;
  patientGender?: string;
  patientPhone?: string;
  contactPhone?: string;
  addressId?: string | null;
  hasVendorLab?: boolean;
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

interface SlotItem {
  id: string;       // the raw string, used as stable key
  time: string;     // raw "6:00 AM - 8:00 AM"
  label: "Morning" | "Afternoon" | "Evening" | "Overnight";
  startHour: number; // 0-23, for "today" gating
}

// Parse "6:00 AM - 8:00 AM" → startHour in 24h (e.g. 6). Returns null if unparseable.
function parseStartHour(raw: string): number | null {
  const m = raw.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const ampm = m[3].toUpperCase();
  if (ampm === "PM" && h !== 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  return h;
}

function bucketFor(startHour: number): SlotItem["label"] {
  if (startHour >= 5 && startHour < 12) return "Morning";
  if (startHour >= 12 && startHour < 17) return "Afternoon";
  if (startHour >= 17 && startHour < 21) return "Evening";
  return "Overnight";
}

function toSlotItems(raw: string[] | null | undefined): SlotItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((r) => {
      const sh = parseStartHour(r);
      if (sh === null) return null;
      return { id: r, time: r, startHour: sh, label: bucketFor(sh) } as SlotItem;
    })
    .filter((x): x is SlotItem => !!x)
    .sort((a, b) => a.startHour - b.startHour);
}

const LabSelectionScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const patientState = (location.state as PatientState) || {};
  const { items, updateLabForItems, subtotal, currentLabId, currentLabName } = useCart();

  const hasVendorLab = patientState.hasVendorLab || !!(currentLabId && currentLabName);

  const [selectedLabId, setSelectedLabId] = useState<string | null>(hasVendorLab ? currentLabId : null);
  const [selectedLabName, setSelectedLabName] = useState<string | null>(hasVendorLab ? currentLabName : null);
  const [selectedDate, setSelectedDate] = useState(0);
  const [selectedTime, setSelectedTime] = useState<number | null>(null);
  const [dateScrollStart, setDateScrollStart] = useState(0);

  const [labs, setLabs] = useState<DiagnosticCenter[]>([]);
  const [labsLoading, setLabsLoading] = useState(!hasVendorLab);

  const dates = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    // Build YYYY-MM-DD from LOCAL date parts to avoid UTC off-by-one
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return {
      day: date.toLocaleDateString("en-US", { weekday: "short" }),
      date: date.getDate(),
      month: date.toLocaleDateString("en-US", { month: "short" }),
      fullDate: `${yyyy}-${mm}-${dd}`,
      available: true,
    };
  });

  // Determine which time slots are selectable based on selected date
  const getSlotAvailability = (slot: typeof timeSlots[0]) => {
    if (selectedDate !== 0) return slot.available; // Not today, all available
    // Today: disable slots whose end time has passed or is current
    const now = new Date();
    const currentHour = now.getHours();
    // The slot covers startHour to startHour+2. If current hour >= startHour+2, it's past.
    // If current hour >= startHour, the slot is "current" — also disable.
    return slot.startHour > currentHour;
  };

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

  // Reset time selection when date changes (to prevent selecting a greyed-out slot)
  useEffect(() => {
    if (selectedTime !== null) {
      const slot = timeSlots.find(s => s.id === selectedTime);
      if (slot && !getSlotAvailability(slot)) {
        setSelectedTime(null);
      }
    }
  }, [selectedDate]);

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

  const visibleDates = dates.slice(dateScrollStart, dateScrollStart + 4);

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

    const selectedSlot = timeSlots.find(s => s.id === selectedTime);

    navigate("/payment", {
      state: {
        cartItems: items.map(item => ({ ...item, labId, labName })),
        scheduledDate: dates[selectedDate].fullDate,
        scheduledTimeSlot: selectedSlot?.time || "",
        subtotal,
        selectedLabName: labName,
        selectedLabId: labId,
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
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDateScrollStart(Math.max(0, dateScrollStart - 1))}
              disabled={dateScrollStart === 0}
              className="w-8 h-8 rounded-full bg-muted flex items-center justify-center disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex-1 flex gap-2">
              {visibleDates.map((date, i) => {
                const actualIndex = dateScrollStart + i;
                return (
                  <button
                    key={actualIndex}
                    onClick={() => date.available && setSelectedDate(actualIndex)}
                    disabled={!date.available}
                    className={`flex-1 py-3 rounded-xl text-center transition-all ${
                      !date.available
                        ? "bg-muted/50 text-muted-foreground opacity-60"
                        : selectedDate === actualIndex
                        ? "bg-primary text-primary-foreground"
                        : "bg-card border border-border text-foreground"
                    }`}
                  >
                    <p className="text-xs font-bold">{date.date} {date.month}</p>
                    <p className="text-[10px] mt-0.5">{date.day}</p>
                    <p className={`text-[9px] mt-0.5 ${
                      !date.available ? "text-destructive" : selectedDate === actualIndex ? "text-primary-foreground/80" : "text-success"
                    }`}>
                      {date.available ? "Available" : "Closed"}
                    </p>
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setDateScrollStart(Math.min(dates.length - 4, dateScrollStart + 1))}
              disabled={dateScrollStart >= dates.length - 4}
              className="w-8 h-8 rounded-full bg-muted flex items-center justify-center disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>

        {/* Time Selection */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-6">
          <h2 className="text-base font-bold text-foreground mb-3">Select Time</h2>
          <div className="mb-4">
            <p className="text-xs text-muted-foreground mb-2 font-medium">☀️ Morning Slots (AM)</p>
            <div className="grid grid-cols-2 gap-2">
              {timeSlots.filter(s => s.label === "Morning").map((slot) => {
                const isAvailable = getSlotAvailability(slot);
                return (
                  <button
                    key={slot.id}
                    onClick={() => isAvailable && setSelectedTime(slot.id)}
                    disabled={!isAvailable}
                    className={`py-2.5 px-3 rounded-xl text-center text-sm transition-all ${
                      !isAvailable
                        ? "bg-muted/50 text-muted-foreground opacity-40 line-through"
                        : selectedTime === slot.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-card border border-border text-foreground"
                    }`}
                  >
                    {slot.time}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-2 font-medium">🌤️ Afternoon & Evening</p>
            <div className="grid grid-cols-2 gap-2">
              {timeSlots.filter(s => s.label !== "Morning").map((slot) => {
                const isAvailable = getSlotAvailability(slot);
                return (
                  <button
                    key={slot.id}
                    onClick={() => isAvailable && setSelectedTime(slot.id)}
                    disabled={!isAvailable}
                    className={`py-2.5 px-3 rounded-xl text-center text-sm transition-all ${
                      !isAvailable
                        ? "bg-muted/50 text-muted-foreground opacity-40 line-through"
                        : selectedTime === slot.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-card border border-border text-foreground"
                    }`}
                  >
                    {slot.time}
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Confirm Button */}
      <div
        className="fixed left-0 right-0 max-w-[430px] mx-auto bg-card border-t border-border px-4 py-3 safe-area-bottom z-40"
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
