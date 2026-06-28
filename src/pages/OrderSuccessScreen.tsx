import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Home, Package, Sparkles, Calendar, User, Phone, Beaker, Receipt, CreditCard, Building2 } from "lucide-react";
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
      initial={{ y: -20, opacity: 1, rotate: 0, scale: 0 }}
      animate={{
        y: ["0%", "800%"],
        opacity: [1, 1, 0.8, 0],
        rotate: randomRotation,
        scale: [0, 1.2, 1, 0.6],
        x: [0, (Math.random() - 0.5) * 120],
      }}
      transition={{
        duration: randomDuration,
        delay: 0.3 + randomDelay,
        ease: "easeOut",
      }}
    />
  );
};

const OrderSuccessScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const bookingState = location.state as BookingState | undefined;

  // The order is already created in PaymentScreen before navigating here.
  // This screen is purely a confirmation view — we MUST NOT invoke create-order
  // again or it produces duplicate rows in the orders table.
  const orderId = bookingState?.orderId ?? null;
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    // Trigger confetti shortly after mount for the success celebration
    const t = setTimeout(() => setShowConfetti(true), 150);
    return () => clearTimeout(t);
  }, []);

  // If the user landed here without a confirmed order, send them back safely.
  useEffect(() => {
    if (!bookingState?.paymentVerified || !orderId) {
      navigate("/bookings", { replace: true });
    }
  }, [bookingState?.paymentVerified, orderId, navigate]);

  // Success state
  return (
    <MobileLayout showNav={false} showFloatingAdd={false}>
      <div className="relative flex flex-col items-center justify-center min-h-screen px-6 text-center overflow-hidden">
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

        {/* Radiating rings behind the checkmark */}
        <div className="relative mb-8">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="absolute inset-0 rounded-full border border-primary/20"
              initial={{ scale: 0.8, opacity: 0.6 }}
              animate={{ scale: 2 + i * 0.8, opacity: 0 }}
              transition={{
                duration: 2,
                delay: 0.5 + i * 0.3,
                repeat: Infinity,
                ease: "easeOut",
              }}
              style={{ width: 96, height: 96, top: 0, left: 0 }}
            />
          ))}

          {/* Glow */}
          <motion.div
            className="absolute -inset-4 rounded-full bg-primary/10 blur-xl"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: [0, 0.6, 0.3], scale: [0.5, 1.2, 1] }}
            transition={{ duration: 1.2, delay: 0.2 }}
          />

          {/* Checkmark circle */}
          <motion.div
            className="relative w-24 h-24 rounded-full bg-gradient-to-br from-primary to-success flex items-center justify-center shadow-lg"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 12, delay: 0.1 }}
            style={{ boxShadow: "0 8px 40px -8px hsl(var(--primary) / 0.5)" }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5, type: "spring", stiffness: 300 }}
            >
              <CheckCircle className="w-12 h-12 text-white" strokeWidth={2.5} />
            </motion.div>
          </motion.div>
        </div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mb-2"
        >
          <h1 className="text-2xl font-bold text-foreground">Order Placed!</h1>
        </motion.div>

        <motion.p
          className="text-muted-foreground text-sm max-w-xs mb-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75 }}
        >
          Your booking has been confirmed successfully. We'll notify you with updates.
        </motion.p>

        {/* Order details card */}
        <motion.div
          className="w-full max-w-sm soft-card p-5 mb-6 text-left"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
        >
          {/* Order ID */}
          {orderId && (
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border/50">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Package className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Order ID</p>
                <p className="text-sm font-semibold text-foreground truncate">{orderId.slice(0, 8).toUpperCase()}</p>
              </div>
            </div>
          )}

          {/* Patient info */}
          {bookingState?.patientName && (
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-accent/50 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Patient</p>
                <p className="text-sm font-medium text-foreground">{bookingState.patientName}</p>
              </div>
            </div>
          )}

          {bookingState?.patientPhone && (
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-accent/50 flex items-center justify-center shrink-0">
                <Phone className="w-4 h-4 text-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Phone</p>
                <p className="text-sm font-medium text-foreground">{bookingState.patientPhone}</p>
              </div>
            </div>
          )}

          {/* Schedule */}
          {(bookingState?.scheduledDate || bookingState?.scheduledTimeSlot) && (
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-accent/50 flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4 text-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Scheduled</p>
                <p className="text-sm font-medium text-foreground">
                  {bookingState.scheduledDate ?? "Today"} • {bookingState.scheduledTimeSlot ?? "Any time"}
                </p>
              </div>
            </div>
          )}

          {/* Lab */}
          {bookingState?.selectedLabName && (
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Diagnostic Lab</p>
                <p className="text-sm font-medium text-foreground truncate">{bookingState.selectedLabName}</p>
              </div>
            </div>
          )}

          {/* Items */}
          {bookingState?.cartItems?.length ? (
            <div className="mt-3 pt-3 border-t border-border/50">
              <div className="flex items-center gap-2 mb-2">
                <Beaker className="w-3.5 h-3.5 text-muted-foreground" />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {bookingState.cartItems.length} {bookingState.cartItems.length > 1 ? "Items" : "Item"}
                </p>
              </div>
              <div className="space-y-1.5">
                {bookingState.cartItems.map((item) => (
                  <div key={item.id} className="flex items-start justify-between gap-3 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="text-foreground font-medium truncate">{item.name}</p>
                      {item.category && (
                        <p className="text-[11px] text-muted-foreground">{item.category}</p>
                      )}
                    </div>
                    <p className="text-foreground font-semibold shrink-0">
                      ₹{(item.price * (item.quantity || 1)).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Bill summary */}
          <div className="mt-3 pt-3 border-t border-border/50 space-y-1.5">
            <div className="flex items-center gap-2 mb-1">
              <Receipt className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Bill Summary</p>
            </div>
            {bookingState?.subtotal != null && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="text-foreground">₹{bookingState.subtotal.toLocaleString()}</span>
              </div>
            )}
            {bookingState?.discount ? (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Discount</span>
                <span className="text-success">- ₹{bookingState.discount.toLocaleString()}</span>
              </div>
            ) : null}
            {bookingState?.selectedPaymentName && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5" /> Payment
                </span>
                <span className="text-foreground">{bookingState.selectedPaymentName}</span>
              </div>
            )}
          </div>

          {/* Total */}
          {bookingState?.total != null && (
            <div className="flex items-center gap-3 pt-3 mt-2 border-t border-border/50">
              <div className="w-9 h-9 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-success" />
              </div>
              <div className="min-w-0 flex-1 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Amount Paid</p>
                <p className="text-base font-bold text-foreground">₹{bookingState.total.toLocaleString()}</p>
              </div>
            </div>
          )}
        </motion.div>

        {/* Actions */}
        <motion.div
          className="w-full max-w-sm space-y-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.05 }}
        >
          <Button
            className="w-full h-12 rounded-2xl text-base font-semibold gap-2"
            onClick={() => navigate("/home")}
          >
            <Home className="w-5 h-5" />
            Back to Home
          </Button>

          <Button
            variant="outline"
            className="w-full h-12 rounded-2xl text-base gap-2"
            onClick={() => navigate("/bookings")}
          >
            <Package className="w-5 h-5" />
            View My Orders
          </Button>
        </motion.div>
      </div>
    </MobileLayout>
  );
};

export default OrderSuccessScreen;
