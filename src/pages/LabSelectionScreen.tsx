import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Building2, Star, Clock, Shield, AlertCircle, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import MobileLayout from "@/components/layout/MobileLayout";
import ScreenHeader from "@/components/layout/ScreenHeader";
import BookingStepper from "@/components/BookingStepper";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";

interface PatientState {
  patientName?: string;
  patientAge?: number | string | null;
  patientGender?: string;
  patientPhone?: string;
  contactPhone?: string;
}

const labs = [
  { id: "lal-pathlabs", name: "Dr. Lal PathLabs", rating: 4.8, reviews: 2500, priceMultiplier: 1, accredited: true, homeCollection: true, reportTime: "Same day" },
  { id: "metropolis", name: "Metropolis Healthcare", rating: 4.7, reviews: 1800, priceMultiplier: 1.05, accredited: true, homeCollection: true, reportTime: "Next day" },
  { id: "srl", name: "SRL Diagnostics", rating: 4.6, reviews: 1500, priceMultiplier: 0.95, accredited: true, homeCollection: true, reportTime: "Same day" },
  { id: "thyrocare", name: "Thyrocare", rating: 4.5, reviews: 3200, priceMultiplier: 0.85, accredited: true, homeCollection: true, reportTime: "Next day" },
  { id: "apollo", name: "Apollo Diagnostics", rating: 4.7, reviews: 2100, priceMultiplier: 1.1, accredited: true, homeCollection: true, reportTime: "Same day" },
];

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
  const { items, updateLabForItems, subtotal } = useCart();
  const [selectedLabId, setSelectedLabId] = useState<string | null>(null);
  const [selectedLabName, setSelectedLabName] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(0);
  const [selectedTime, setSelectedTime] = useState<number | null>(null);
  const [dateScrollStart, setDateScrollStart] = useState(0);

  const dates = Array.from({ length: 14 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    return {
      day: date.toLocaleDateString("en-US", { weekday: "short" }),
      date: date.getDate(),
      month: date.toLocaleDateString("en-US", { month: "short" }),
      fullDate: date.toISOString().split("T")[0],
      available: i !== 2, // example: day 3 booking closed
    };
  });

  useEffect(() => {
    if (items.length === 0) { navigate("/cart"); }
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
    if (!selectedLabId || !selectedLabName) { toast.error("Please select a lab"); return; }
    if (selectedTime === null) { toast.error("Please select a time slot"); return; }

    updateLabForItems(selectedLabId, selectedLabName);
    const selectedSlot = timeSlots.find(s => s.id === selectedTime);

    navigate("/payment", {
      state: {
        cartItems: items.map(item => ({ ...item, labId: selectedLabId, labName: selectedLabName })),
        scheduledDate: dates[selectedDate].fullDate,
        scheduledTimeSlot: selectedSlot?.time || "",
        subtotal,
        selectedLabName,
        selectedLabId,
        ...patientState,
      },
    });
  };

  return (
    <MobileLayout>
      <ScreenHeader title="Select Lab & Slot" />
      <BookingStepper currentStep={2} />

      <div className="px-4 pb-32">
        {/* Lab Selection */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6">
          <h2 className="text-base font-bold text-foreground mb-3">Choose Your Lab</h2>
          <div className="space-y-2">
            {labs.map((lab) => {
              const labPrice = Math.round(subtotal * lab.priceMultiplier);
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
                      <span>{lab.rating}</span>
                      <span>•</span>
                      <Clock className="w-3 h-3" />
                      <span>{lab.reportTime}</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-foreground">₹{labPrice}</p>
                    {lab.priceMultiplier < 1 && (
                      <p className="text-[10px] text-success">Save ₹{subtotal - labPrice}</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </motion.div>

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

          {/* Morning Slots */}
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

          {/* Afternoon / Evening */}
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
          disabled={!selectedLabId || selectedTime === null}
          onClick={handleConfirm}
        >
          Confirm
        </Button>
      </motion.div>
    </MobileLayout>
  );
};

export default LabSelectionScreen;
