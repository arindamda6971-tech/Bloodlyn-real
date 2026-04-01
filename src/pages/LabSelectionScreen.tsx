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
}

const timeSlots = [
  { id: 1, time: "6:00 AM - 8:00 AM", label: "Morning", available: true },
  { id: 2, time: "8:00 AM - 10:00 AM", label: "Morning", available: true },
  { id: 3, time: "10:00 AM - 12:00 PM", label: "Morning", available: true },
  { id: 4, time: "12:00 PM - 2:00 PM", label: "Afternoon", available: false },
  { id: 5, time: "2:00 PM - 4:00 PM", label: "Afternoon", available: true },
  { id: 6, time: "4:00 PM - 6:00 PM", label: "Evening", available: true },
];

const LabSelectionScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const patientState = (location.state as PatientState) || {};
  const { items, updateLabForItems, subtotal, currentLabId, currentLabName } = useCart();

  // If user booked from a vendor profile, lab is already chosen
  const hasVendorLab = patientState.hasVendorLab || !!(currentLabId && currentLabName);

  const [selectedLabId, setSelectedLabId] = useState<string | null>(hasVendorLab ? currentLabId : null);
  const [selectedLabName, setSelectedLabName] = useState<string | null>(hasVendorLab ? currentLabName : null);
  const [selectedDate, setSelectedDate] = useState(0);
  const [selectedTime, setSelectedTime] = useState<number | null>(null);
  const [dateScrollStart, setDateScrollStart] = useState(0);

  // Real diagnostic centers from Supabase
  const [labs, setLabs] = useState<DiagnosticCenter[]>([]);
  const [labsLoading, setLabsLoading] = useState(!hasVendorLab);

  const dates = Array.from({ length: 14 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    return {
      day: date.toLocaleDateString("en-US", { weekday: "short" }),
      date: date.getDate(),
      month: date.toLocaleDateString("en-US", { month: "short" }),
      fullDate: date.toISOString().split("T")[0],
      available: i !== 2,
    };
  });

  // Fetch diagnostic centers from Supabase (only when lab selection is needed)
  useEffect(() => {
    if (hasVendorLab) return;

    const fetchLabs = async () => {
      try {
        const { data, error } = await supabase
          .from("diagnostic_centers")
          .select("id, name, rating, reviews_count, home_collection_available, vendor_id, opening_time, closing_time")
          .eq("is_active", true)
          .order("rating", { ascending: false });

        if (!error && data) {
          setLabs(data);
        }
      } catch (err) {
        console.error("Error fetching labs:", err);
      } finally {
        setLabsLoading(false);
      }
    };
    fetchLabs();
  }, [hasVendorLab]);

  useEffect(() => {
    if (items.length === 0) navigate("/cart");
  }, [items, navigate]);

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

  const getReportTime = (lab: DiagnosticCenter) => {
    return lab.opening_time ? `${lab.opening_time} - ${lab.closing_time || "9 PM"}` : "Same day";
  };

  return (
    <MobileLayout>
      <ScreenHeader title="Select Lab & Slot" />
      <BookingStepper currentStep={2} />

      <div className="px-4 pb-32">
        {/* Lab Selection - only show when user hasn't booked from a vendor profile */}
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
                <p className="text-sm text-muted-foreground">No labs available in your area</p>
              </div>
            ) : (
              <div className="space-y-2">
                {labs.map((lab) => (
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
                        <span>•</span>
                        <Clock className="w-3 h-3" />
                        <span>{getReportTime(lab)}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Show selected lab info when vendor lab is pre-selected */}
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
              {timeSlots.filter(s => s.label === "Morning").map((slot) => (
                <button
                  key={slot.id}
                  onClick={() => slot.available && setSelectedTime(slot.id)}
                  disabled={!slot.available}
                  className={`py-2.5 px-3 rounded-xl text-center text-sm transition-all ${
                    !slot.available
                      ? "bg-muted/50 text-muted-foreground opacity-50"
                      : selectedTime === slot.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-card border border-border text-foreground"
                  }`}
                >
                  {slot.time}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-2 font-medium">🌤️ Afternoon & Evening</p>
            <div className="grid grid-cols-2 gap-2">
              {timeSlots.filter(s => s.label !== "Morning").map((slot) => (
                <button
                  key={slot.id}
                  onClick={() => slot.available && setSelectedTime(slot.id)}
                  disabled={!slot.available}
                  className={`py-2.5 px-3 rounded-xl text-center text-sm transition-all ${
                    !slot.available
                      ? "bg-muted/50 text-muted-foreground opacity-50"
                      : selectedTime === slot.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-card border border-border text-foreground"
                  }`}
                >
                  {slot.time}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Confirm Button */}
      <motion.div
        initial={{ y: 100 }} animate={{ y: 0 }}
        className="fixed bottom-24 left-0 right-0 max-w-[430px] mx-auto bg-card/95 backdrop-blur-xl border-t border-border px-4 py-4 safe-area-bottom z-40"
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
    </MobileLayout>
  );
};

export default LabSelectionScreen;
