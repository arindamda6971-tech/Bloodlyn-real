import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Clock,
  Calendar,
  Navigation,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import MobileLayout from "@/components/layout/MobileLayout";
import ScreenHeader from "@/components/layout/ScreenHeader";
import { useCart } from "@/contexts/CartContext";
import { supabase } from "@/integrations/supabase/client";
import { evaluateLabServiceability } from "@/lib/labServiceability";
import { toast } from "sonner";

interface LocationState {
  selectedAddressId?: string;
}

interface AddressRecord {
  id: string;
  pincode: string;
  latitude: number | null;
  longitude: number | null;
}

interface LabRecord {
  id: string;
  pincode: string;
  service_pincodes: string[] | null;
  latitude: number | null;
  longitude: number | null;
  is_active: boolean | null;
}

const timeSlots = [
  { id: 1, time: "6:00 AM - 8:00 AM", available: true, phlebotomists: 5 },
  { id: 2, time: "8:00 AM - 10:00 AM", available: true, phlebotomists: 8 },
  { id: 3, time: "10:00 AM - 12:00 PM", available: true, phlebotomists: 6 },
  { id: 4, time: "12:00 PM - 2:00 PM", available: false, phlebotomists: 0 },
  { id: 5, time: "2:00 PM - 4:00 PM", available: true, phlebotomists: 4 },
  { id: 6, time: "4:00 PM - 6:00 PM", available: true, phlebotomists: 7 },
  { id: 7, time: "6:00 PM - 8:00 PM", available: true, phlebotomists: 3 },
  { id: 8, time: "8:00 PM - 10:00 PM", available: true, phlebotomists: 2 },
];

const BookingScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as LocationState | null;
  const { items: cartItems, subtotal } = useCart();
  const [selectedDate, setSelectedDate] = useState(0);
  const [selectedTime, setSelectedTime] = useState(2);
  const [selectedAddress, setSelectedAddress] = useState<AddressRecord | null>(null);
  const [selectedLab, setSelectedLab] = useState<LabRecord | null>(null);
  const [isValidatingDistance, setIsValidatingDistance] = useState(true);
  const [isProceeding, setIsProceeding] = useState(false);

  // Get addressId from cart navigation
  const selectedAddressId = locationState?.selectedAddressId || null;

  const dates = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    return {
      day: date.toLocaleDateString("en-US", { weekday: "short" }),
      date: date.getDate(),
      month: date.toLocaleDateString("en-US", { month: "short" }),
      fullDate: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`, // YYYY-MM-DD local
    };
  });

  const labId = useMemo(() => cartItems[0]?.labId || null, [cartItems]);

  useEffect(() => {
    const validateDistance = async () => {
      if (!selectedAddressId || !labId) {
        setSelectedAddress(null);
        setSelectedLab(null);
        setIsValidatingDistance(false);
        return;
      }

      setIsValidatingDistance(true);
      try {
        const [{ data: address }, { data: lab }] = await Promise.all([
          supabase
            .from("addresses")
            .select("id, pincode, latitude, longitude")
            .eq("id", selectedAddressId)
            .maybeSingle(),
          supabase
            .from("diagnostic_centers")
            .select("id, pincode, service_pincodes, latitude, longitude, is_active")
            .eq("id", labId)
            .maybeSingle(),
        ]);

        setSelectedAddress((address as AddressRecord | null) ?? null);
        setSelectedLab((lab as LabRecord | null) ?? null);
      } catch (error) {
        console.error("Distance validation failed:", error);
        toast.error("Could not validate this lab for your address.");
      } finally {
        setIsValidatingDistance(false);
      }
    };

    validateDistance();
  }, [selectedAddressId, labId]);

  const serviceability = useMemo(
    () => evaluateLabServiceability(selectedLab, selectedAddress),
    [selectedLab, selectedAddress]
  );

  const outOfRange = !isValidatingDistance && labId && !serviceability.serviceable;

  return (
    <MobileLayout>
      <ScreenHeader title="Book Appointment" />

      <div className="px-4 pb-32">
        {/* Map placeholder */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 h-40 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center relative overflow-hidden"
        >
          <div className="absolute inset-0 opacity-50" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%234AB3F4' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
          <div className="text-center relative z-10">
            <Navigation className="w-8 h-8 text-primary mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Detecting your location...</p>
          </div>
          <Badge variant="live" className="absolute top-3 right-3">
            5 phlebotomists nearby
          </Badge>
        </motion.div>


        {/* Date selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-6"
        >
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Select Date</h3>
          </div>
          <div className="flex gap-2 overflow-x-auto hide-scrollbar">
            {dates.map((date, index) => (
              <button
                key={index}
                onClick={() => setSelectedDate(index)}
                className={`flex-shrink-0 w-16 py-3 rounded-2xl text-center transition-all ${
                  selectedDate === index
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                <p className="text-xs opacity-80">{date.day}</p>
                <p className="text-lg font-bold">{date.date}</p>
                <p className="text-xs opacity-80">{date.month}</p>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Time slot selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6"
        >
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Select Time Slot</h3>
            <Badge variant="soft">24/7 Available</Badge>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {timeSlots.map((slot) => (
              <button
                key={slot.id}
                onClick={() => slot.available && setSelectedTime(slot.id)}
                disabled={!slot.available}
                className={`py-3 px-4 rounded-xl text-center transition-all ${
                  !slot.available
                    ? "bg-muted/50 text-muted-foreground opacity-50"
                    : selectedTime === slot.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                <p className="text-sm font-medium">{slot.time}</p>
                {slot.available && (
                  <p className={`text-xs mt-1 ${
                    selectedTime === slot.id ? "opacity-80" : "text-muted-foreground"
                  }`}>
                    {slot.phlebotomists} available
                  </p>
                )}
              </button>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Bottom CTA */}
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="fixed bottom-24 left-0 right-0 max-w-[430px] mx-auto bg-card/95 backdrop-blur-xl border-t border-border px-4 py-4 safe-area-bottom"
      >
        {outOfRange && (
          <div className="mb-3 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>This lab does not service your selected area.</span>
          </div>
        )}
        <Button
          variant="hero"
          className="w-full"
          size="lg"
          disabled={!selectedAddressId || cartItems.length === 0 || isValidatingDistance || !!outOfRange || isProceeding}
          onClick={() => {
            if (isProceeding) return;
            setIsProceeding(true);
            navigate("/payment", {
              state: {
                cartItems: cartItems,
                addressId: selectedAddressId,
                scheduledDate: dates[selectedDate].fullDate,
                scheduledTimeSlot: timeSlots.find(s => s.id === selectedTime)?.time || "",
                subtotal: subtotal,
              },
            });
          }}
        >
          {isProceeding ? "Please wait…" : `Confirm Booking • ₹${subtotal}`}
        </Button>
      </motion.div>
    </MobileLayout>
  );
};

export default BookingScreen;
