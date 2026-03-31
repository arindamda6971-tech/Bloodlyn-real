import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Tag, Calendar, Clock, MapPin, ChevronDown, ChevronUp, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import MobileLayout from "@/components/layout/MobileLayout";
import ScreenHeader from "@/components/layout/ScreenHeader";
import BookingStepper from "@/components/BookingStepper";
import { useCart } from "@/contexts/CartContext";

interface PaymentState {
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
  addressId?: string | null;
  scheduledDate?: string | null;
  scheduledTimeSlot?: string | null;
  subtotal: number;
  selectedLabName?: string;
  selectedLabId?: string;
  patientName?: string;
  patientAge?: number | string | null;
  patientGender?: string | null;
  patientPhone?: string | null;
  contactPhone?: string | null;
}

const PaymentScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { subtotal: cartSubtotal } = useCart();
  const paymentState = location.state as PaymentState | undefined;

  const stateSubtotal = paymentState?.subtotal || cartSubtotal;
  const [couponCode, setCouponCode] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);
  const [appointmentOpen, setAppointmentOpen] = useState(true);
  const [orderOpen, setOrderOpen] = useState(true);

  const discount = couponApplied ? 100 : 0;
  const total = stateSubtotal - discount;

  const applyCoupon = () => {
    if (couponCode.toUpperCase() === "HEALTH100") setCouponApplied(true);
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "Today";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", weekday: "short" });
    } catch { return dateStr; }
  };

  const handlePayment = () => {
    const paymentVerified = true; // cash on delivery
    navigate("/order-success", {
      state: {
        ...paymentState,
        couponApplied,
        discount,
        total,
        selectedPayment: "cash",
        paymentVerified,
      },
    });
  };

  return (
    <MobileLayout>
      <ScreenHeader title="Check Out" />
      <BookingStepper currentStep={3} />

      <div className="px-4 pb-32">
        {/* Appointment Details */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl border border-border p-4 mb-4">
          <button onClick={() => setAppointmentOpen(!appointmentOpen)} className="w-full flex items-center justify-between">
            <h3 className="text-base font-bold text-foreground">Appointment Details</h3>
            {appointmentOpen ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
          </button>
          {appointmentOpen && (
            <div className="mt-3 space-y-2.5">
              <div className="flex items-center gap-2 text-sm text-foreground">
                <MapPin className="w-4 h-4 text-primary" />
                <span>{paymentState?.selectedLabName || "Home Collection"}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-foreground">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span>{formatDate(paymentState?.scheduledDate)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-primary" />
                  <span>{paymentState?.scheduledTimeSlot || "Any time"}</span>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Order Details */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card rounded-2xl border border-border p-4 mb-4">
          <button onClick={() => setOrderOpen(!orderOpen)} className="w-full flex items-center justify-between">
            <h3 className="text-base font-bold text-foreground">Order Details</h3>
            {orderOpen ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
          </button>
          {orderOpen && (
            <div className="mt-3">
              {/* Patient */}
              {paymentState?.patientName && (
                <div className="flex items-center gap-2 mb-3 pb-3 border-b border-border/50">
                  <User className="w-4 h-4 text-primary" />
                  <span className="font-medium text-foreground text-sm">{paymentState.patientName}</span>
                </div>
              )}
              {/* Items */}
              <div className="space-y-2">
                {(paymentState?.cartItems || []).map((item) => (
                  <div key={item.id} className="flex justify-between items-center text-sm">
                    <span className="text-foreground flex-1 truncate pr-4">{item.name}</span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-foreground font-semibold">₹ {item.price * item.quantity}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        {/* Offers & Benefits */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mb-4">
          <h3 className="text-base font-bold text-foreground mb-3">Offers & Benefits</h3>
          <div className="bg-card rounded-2xl border border-border p-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Tag className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex gap-2">
                  <Input
                    placeholder="Apply Coupon Code"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    className="flex-1 bg-muted border-0 rounded-lg h-9 text-sm"
                    disabled={couponApplied}
                  />
                  <Button variant="soft" size="sm" onClick={applyCoupon} disabled={couponApplied} className="h-9">
                    {couponApplied ? "Applied" : "Apply"}
                  </Button>
                </div>
              </div>
            </div>
            {couponApplied && (
              <Badge variant="softSuccess" className="mt-2 ml-11">
                HEALTH100 applied — ₹100 off
              </Badge>
            )}
          </div>
        </motion.div>

        {/* Bill Summary */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card rounded-2xl border border-border p-4">
          <h3 className="text-base font-bold text-foreground mb-3">Bill Summary</h3>
          <div className="space-y-2.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">MRP Total</span>
              <span className="text-foreground">₹ {stateSubtotal}.0/-</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Home Collection</span>
              <span className="text-success font-medium">FREE</span>
            </div>
            {couponApplied && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Coupon Discount</span>
                <span className="text-success font-medium">- ₹ {discount}.0/-</span>
              </div>
            )}
            <div className="h-px bg-border my-2" />
            <div className="flex justify-between">
              <span className="font-bold text-foreground">Payable Amount</span>
              <span className="font-bold text-lg text-foreground">₹ {total}.0/-</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Pay Button */}
      <motion.div
        initial={{ y: 100 }} animate={{ y: 0 }}
        className="fixed bottom-24 left-0 right-0 max-w-[430px] mx-auto bg-card/95 backdrop-blur-xl border-t border-border px-4 py-4 safe-area-bottom z-40"
      >
        <Button variant="hero" className="w-full" size="lg" onClick={handlePayment}>
          Pay ₹ {total}/-
        </Button>
      </motion.div>
    </MobileLayout>
  );
};

export default PaymentScreen;
