import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Home, Package, Sparkles, Calendar, User, Phone, Beaker, Receipt, CreditCard, Building2, FileText, Check, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import MobileLayout from "@/components/layout/MobileLayout";

interface BookingState {
  cartItems: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    familyMemberId?: string;
    packageId?: string;
    labId?: string;
    labName?: string;
    vendorId?: string;
    category?: string;
  }>;
  addressId: string | null;
  scheduledDate: string | null;
  scheduledTimeSlot: string | null;
  subtotal: number;
  couponApplied?: boolean;
  discount?: number;
  platformFee?: number;
  total?: number;
  selectedPayment?: string;
  selectedPaymentName?: string;
  paymentVerified?: boolean;
  patientName?: string;
  patientAge?: number | string;
  patientGender?: string | null;
  patientPhone?: string | null;
  orderId?: string | null;
  orderNumber?: string | null;
  selectedLabName?: string;
  selectedLabId?: string;
  orderAddressString?: string;
}

const confettiColors = [
  "hsl(var(--primary))",
  "hsl(var(--success))",
  "hsl(201 88% 62%)",
  "hsl(142 71% 45%)",
  "hsl(48 96% 53%)",
  "hsl(280 65% 60%)",
];

const ConfettiPiece = ({ index }: { index: number }) => {
  const randomX = Math.random() * 100;
  const randomDelay = Math.random() * 0.8;
  const randomDuration = 1.5 + Math.random() * 1.5;
  const randomRotation = Math.random() * 720 - 360;
  const color = confettiColors[index % confettiColors.length];
  const size = 6 + Math.random() * 8;
  const isCircle = Math.random() > 0.5;

  return (
    <motion.div
      className="absolute top-0 pointer-events-none"
      style={{
        left: `${randomX}%`,
        width: size,
        height: isCircle ? size : size * 2.5,
        borderRadius: isCircle ? "50%" : "2px",
        backgroundColor: color,
      }}
      initial={false}
      animate={{
        y: ["0%", "800%"],
        opacity: [1, 1, 0.8, 0],
        rotate: randomRotation,
        scale: [0, 1.2, 1, 0.6],
        x: [0, (Math.random() - 0.5) * 120],
      }}
      transition={{
        duration: randomDuration,
        delay: 0,
        ease: "easeOut",
      }}
    />
  );
};

const Divider = () => <div className="h-[1px] w-full bg-slate-100" />;

const OrderSuccessScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const bookingState = location.state as BookingState | undefined;

  const orderId = bookingState?.orderId ?? null;
  const [showConfetti, setShowConfetti] = useState(false);

  const [fetchedAddress, setFetchedAddress] = useState<string | null>(null);

  useEffect(() => {
    // Trigger confetti shortly after mount for the success celebration
    const t = setTimeout(() => setShowConfetti(true), 150);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!bookingState?.paymentVerified || !orderId) {
      navigate("/bookings", { replace: true });
    }
  }, [bookingState?.paymentVerified, orderId, navigate]);

  useEffect(() => {
    // If we already have the string from the payload, no need to fetch
    if (bookingState?.orderAddressString) return;
    
    // Fetch if we have an addressId but no string
    if (bookingState?.addressId) {
      const addressId = bookingState.addressId;
      const fetchAddress = async () => {
        try {
          const { supabase } = await import("@/integrations/supabase/client");
          const { data } = await supabase
            .from("addresses")
            .select("*")
            .eq("id", addressId)
            .maybeSingle();
            
          if (data) {
            const str = [data.address_line1, data.address_line2, data.city, data.state, data.pincode].filter(Boolean).join(", ");
            setFetchedAddress(str);
          }
        } catch (err) {
          console.error("Failed to fetch address:", err);
        }
      };
      fetchAddress();
    }
  }, [bookingState?.addressId, bookingState?.orderAddressString]);

  const displayAddress = bookingState?.orderAddressString || fetchedAddress;

  return (
    <MobileLayout showNav={false} showFloatingAdd={false}>
      {/* 
        We use min-h-[100dvh] so it takes up the full screen, 
        and flex-col with overflow-y-auto so it fits on one screen if small enough, 
        but allows scrolling if the content is too tall.
      */}
      <div className="relative min-h-[100dvh] w-full max-w-md mx-auto bg-[#F7F9FC] md:bg-white flex flex-col pt-8 pb-6 px-4 sm:px-6 overflow-y-auto">
        
        {/* Background blobs matching the mockup */}
        <div className="absolute top-0 left-0 w-40 h-40 bg-blue-100 rounded-br-full opacity-50 pointer-events-none -z-10 blur-[40px]" />
        <div className="absolute top-0 right-0 w-40 h-40 bg-green-100 rounded-bl-full opacity-50 pointer-events-none -z-10 blur-[40px]" />

        {/* Confetti */}
        <AnimatePresence>
          {showConfetti && (
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
              {Array.from({ length: 40 }).map((_, i) => (
                <ConfettiPiece key={i} index={i} />
              ))}
            </div>
          )}
        </AnimatePresence>

        {/* 1. Header Area */}
        <div className="flex flex-col items-center text-center mt-2 mb-6 shrink-0">
          <div className="relative mb-4">
            {/* Radiating decorative lines */}
            <div className="absolute -inset-6 flex items-center justify-center pointer-events-none">
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full absolute top-0 -translate-y-4 opacity-70" />
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full absolute bottom-0 translate-y-4 opacity-70" />
              <div className="w-1 h-3 bg-green-400 rounded-full absolute -left-4 -rotate-45 opacity-70" />
              <div className="w-1 h-3 bg-blue-400 rounded-full absolute -right-4 rotate-45 opacity-70" />
            </div>
            
            <motion.div
              className="relative w-[72px] h-[72px] rounded-full bg-[#2dd4bf] flex items-center justify-center shadow-[0_8px_30px_rgb(45,212,191,0.3)]"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
            >
              <Check className="w-10 h-10 text-white" strokeWidth={3} />
            </motion.div>
          </div>
          
          <h1 className="text-[22px] font-bold text-[#0f172a] tracking-tight mb-1">Order Placed!</h1>
          <p className="text-[13px] text-slate-500 max-w-[260px] leading-snug">
            Your booking has been confirmed successfully. We'll notify you with updates.
          </p>
        </div>

        {/* 2. Main Card Container */}
        <div className="bg-white rounded-[24px] shadow-[0_4px_24px_rgb(0,0,0,0.03)] border border-slate-100 p-4 mb-6 shrink-0 flex flex-col gap-3.5">
          
          {/* Order ID Row */}
          {orderId && (
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0 flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-slate-500 font-medium mb-0.5">Order ID</p>
                  <p className="text-[14px] font-bold text-slate-800 tracking-tight truncate">{orderId.slice(0, 8).toUpperCase()}</p>
                </div>
                <div className="flex items-center gap-1 bg-green-50 text-green-700 px-2.5 py-1 rounded-full border border-green-100/50">
                  <CheckCircle className="w-3 h-3" />
                  <span className="text-[11px] font-bold tracking-wide">Confirmed</span>
                </div>
              </div>
            </div>
          )}

          <Divider />

          {/* Patient Name */}
          {bookingState?.patientName && (
            <>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-sky-50 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-sky-500" />
                </div>
                <div>
                  <p className="text-[11px] text-slate-500 font-medium mb-0.5">Patient Name</p>
                  <p className="text-[14px] font-bold text-slate-800">{bookingState.patientName}</p>
                </div>
              </div>
              <Divider />
            </>
          )}

          {/* Phone Number */}
          {bookingState?.patientPhone && (
            <>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                  <Phone className="w-4 h-4 text-indigo-500" />
                </div>
                <div>
                  <p className="text-[11px] text-slate-500 font-medium mb-0.5">Phone Number</p>
                  <p className="text-[14px] font-bold text-slate-800">{bookingState.patientPhone}</p>
                </div>
              </div>
              <Divider />
            </>
          )}

          {/* Scheduled Date & Time */}
          {(bookingState?.scheduledDate || bookingState?.scheduledTimeSlot) && (
            <>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4 text-blue-500" />
                </div>
                <div>
                  <p className="text-[11px] text-slate-500 font-medium mb-0.5">Scheduled Date & Time</p>
                  <p className="text-[14px] font-bold text-slate-800">
                    {bookingState.scheduledDate ?? "Today"} <span className="text-slate-400 mx-1">•</span> {bookingState.scheduledTimeSlot ?? "Any time"}
                  </p>
                </div>
              </div>
              <Divider />
            </>
          )}

          {/* Diagnostic Lab */}
          {bookingState?.selectedLabName && (
            <>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-sky-50 flex items-center justify-center shrink-0">
                  <Building2 className="w-4 h-4 text-sky-500" />
                </div>
                <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] text-slate-500 font-medium mb-0.5">Diagnostic Lab</p>
                    <p className="text-[14px] font-bold text-slate-800 truncate">{bookingState.selectedLabName}</p>
                  </div>
                  {/* Mock "View on Map" matching reference image */}
                  <div className="flex items-center gap-1 bg-sky-50 text-[#0ea5e9] px-2 py-1 rounded-md shrink-0">
                    <MapPin className="w-3 h-3" />
                    <span className="text-[10px] font-semibold">View on Map</span>
                  </div>
                </div>
              </div>
              <Divider />
            </>
          )}

          {/* Collection Address */}
          {displayAddress && (
            <>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                  <Home className="w-4 h-4 text-green-600" />
                </div>
                <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] text-slate-500 font-medium mb-0.5">Collection Address</p>
                    <p className="text-[14px] font-bold text-slate-800 line-clamp-2 leading-tight">{displayAddress}</p>
                  </div>
                </div>
              </div>
              <Divider />
            </>
          )}

          {/* Test Details */}
          {bookingState?.cartItems?.length ? (
            <>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
                    <Beaker className="w-4 h-4 text-purple-500" />
                  </div>
                  <div className="flex-1 flex items-center justify-between">
                    <p className="text-[14px] font-bold text-slate-800">Test Details</p>
                    <div className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide">
                      {bookingState.cartItems.length} {bookingState.cartItems.length > 1 ? "Items" : "Item"}
                    </div>
                  </div>
                </div>
                <div className="bg-slate-50/70 rounded-[14px] p-3 border border-slate-100 flex flex-col gap-2 ml-12">
                  {bookingState.cartItems.map((item) => (
                    <div key={item.id} className="flex justify-between items-start">
                      <p className="text-[13px] font-semibold text-slate-700 leading-tight pr-4">{item.name}</p>
                      <p className="text-[13px] font-bold text-slate-900 shrink-0">₹{(item.price * (item.quantity || 1)).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>
              <Divider />
            </>
          ) : null}

          {/* Bill Summary */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-3 mb-0.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                <Receipt className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-[14px] font-bold text-slate-800">Bill Summary</p>
            </div>
            
            <div className="pl-12 pr-1 flex flex-col gap-1.5">
              {bookingState?.subtotal != null && (
                <div className="flex justify-between text-[13px]">
                  <span className="text-slate-500 font-medium">Subtotal</span>
                  <span className="font-bold text-slate-800">₹{bookingState.subtotal.toLocaleString()}</span>
                </div>
              )}
              {bookingState?.discount ? (
                <div className="flex justify-between text-[13px]">
                  <span className="text-slate-500 font-medium">Discount</span>
                  <span className="font-bold text-green-600">- ₹{bookingState.discount.toLocaleString()}</span>
                </div>
              ) : (
                <div className="flex justify-between text-[13px]">
                  <span className="text-slate-500 font-medium">Discount</span>
                  <span className="font-bold text-green-600">₹0</span>
                </div>
              )}
              <div className="flex justify-between text-[13px]">
                <span className="text-slate-500 font-medium">Platform fee</span>
                <span className="font-bold text-slate-800">₹{(bookingState?.platformFee ?? 0).toLocaleString()}</span>
              </div>
              {bookingState?.selectedPaymentName && (
                <div className="flex justify-between text-[13px]">
                  <span className="text-slate-500 font-medium">Payment Method</span>
                  <span className="font-bold text-slate-800">{bookingState.selectedPaymentName}</span>
                </div>
              )}
            </div>

            {/* Amount Paid - Green Box */}
            {bookingState?.total != null && (
              <div className="bg-[#f0fdf4] rounded-xl p-3 flex justify-between items-center border border-green-200 mt-2">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-green-600" />
                  <span className="text-[14px] font-bold text-green-800">Amount Paid</span>
                </div>
                <span className="text-[18px] font-black text-green-900">₹{bookingState.total.toLocaleString()}</span>
              </div>
            )}
          </div>

        </div>

        {/* 3. Action Buttons */}
        {/* We use mt-auto so if the content is short, buttons stick to bottom of available space, but if long they just flow below */}
        <div className="flex flex-col gap-3 mt-auto shrink-0 pb-safe pb-4">
          <Button
            className="w-full h-[48px] rounded-2xl bg-[#0f172a] hover:bg-[#1e293b] text-white text-[15px] font-bold shadow-sm flex items-center justify-center gap-2"
            onClick={() => navigate("/home")}
          >
            <Home className="w-[18px] h-[18px]" />
            Back to Home
          </Button>
          <Button
            variant="outline"
            className="w-full h-[48px] rounded-2xl border-2 border-[#0f172a] text-[#0f172a] hover:bg-slate-50 text-[15px] font-bold flex items-center justify-center gap-2 shadow-sm"
            onClick={() => navigate("/bookings")}
          >
            <Package className="w-[18px] h-[18px]" />
            View My Orders
          </Button>
        </div>

      </div>
    </MobileLayout>
  );
};

export default OrderSuccessScreen;
