import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Home, Clock, Package, Sparkles, Calendar, User, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import MobileLayout from "@/components/layout/MobileLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/contexts/CartContext";

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
  paymentVerified?: boolean;
  patientName?: string;
  patientAge?: number | string;
  patientGender?: string | null;
  patientPhone?: string | null;
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
  const { supabaseUserId } = useAuth();
  const { items: cartItems, clearCart } = useCart();
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const hasAttemptedRef = useRef(false);

  const bookingState = location.state as BookingState | undefined;

  // Create order on mount — guarded by ref so it only fires once
  useEffect(() => {
    if (hasAttemptedRef.current) return;

    const stateCartItems = bookingState?.cartItems || cartItems;

    // Wait for auth + cart to be ready before attempting
    if (!supabaseUserId) return;
    if (!stateCartItems || stateCartItems.length === 0) return;

    hasAttemptedRef.current = true;

    const createOrder = async () => {
      setIsCreatingOrder(true);
      setOrderError(null);

      try {
        const subtotal = bookingState?.subtotal || stateCartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const discount = bookingState?.discount || 0;
        const total = bookingState?.total || subtotal;
        const paymentMethod = bookingState?.selectedPayment || null;

        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData?.session?.access_token;
        if (!accessToken) {
          setOrderError("Please log in to complete your booking");
          setIsCreatingOrder(false);
          return;
        }

        const idempotencyKey = (crypto as any)?.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

        const { data: fnData, error: fnError } = await supabase.functions.invoke("create-order", {
          headers: { "Idempotency-Key": idempotencyKey },
          body: {
            cartItems: stateCartItems
              .filter((item: any) => item && item.id)
              .map((item: any) => ({
                id: String(item.id),
                name: (item.name && String(item.name).trim()) || "Test",
                price: Number(item.price) || 0,
                quantity: Number(item.quantity) || 1,
                familyMemberId: item.familyMemberId || null,
                packageId: item.packageId || null,
                category: item.category || undefined,
                labId: item.labId || null,
                labName: item.labName || null,
                vendorId: item.vendorId || null,
              })),
            addressId: bookingState?.addressId || null,
            scheduledDate: bookingState?.scheduledDate || null,
            scheduledTimeSlot: bookingState?.scheduledTimeSlot || null,
            subtotal,
            discount,
            total,
            paymentMethod,
            couponCode: bookingState?.couponApplied ? "HEALTH100" : null,
            patientName: bookingState?.patientName,
            patientAge: bookingState?.patientAge,
            patientGender: bookingState?.patientGender,
            patientPhone: bookingState?.patientPhone,
            labId: stateCartItems[0]?.labId || null,
            labName: stateCartItems[0]?.labName || null,
            vendorId: stateCartItems[0]?.vendorId || null,
          },
        });

        if (fnError) throw fnError;
        if (fnData?.error) throw new Error(fnData.error);

        setOrderId(fnData.orderId);
        clearCart();
        setShowConfetti(true);
      } catch (error) {
        if (import.meta.env.DEV) console.error("Error creating order:", error);
        setOrderError("Failed to create order. Please try again.");
        // Allow retry on transient failure
        hasAttemptedRef.current = false;
      } finally {
        setIsCreatingOrder(false);
      }
    };

    createOrder();
  }, [supabaseUserId, bookingState, cartItems, clearCart]);

  // Loading state
  if (isCreatingOrder) {
    return (
      <MobileLayout showNav={false}>
        <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
          <motion.div
            className="relative w-24 h-24 mb-8"
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <div className="absolute inset-0 rounded-full border-4 border-muted" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary" />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className="text-xl font-bold text-foreground mb-2">Placing your order...</h2>
            <p className="text-sm text-muted-foreground">Hang tight, we're confirming your booking</p>
          </motion.div>
        </div>
      </MobileLayout>
    );
  }

  // Error state
  if (orderError) {
    return (
      <MobileLayout showNav={false}>
        <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="w-20 h-20 rounded-full bg-destructive/15 flex items-center justify-center mb-6"
          >
            <Clock className="w-10 h-10 text-destructive" />
          </motion.div>
          <h2 className="text-xl font-bold text-foreground mb-2">{orderError}</h2>
          <p className="text-sm text-muted-foreground mb-8">Please go back and try again</p>
          <Button variant="soft" onClick={() => navigate("/cart")} className="px-8">
            Return to Cart
          </Button>
        </div>
      </MobileLayout>
    );
  }

  // Success state
  return (
    <MobileLayout showNav={false}>
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

          {/* Total */}
          {bookingState?.total != null && (
            <div className="flex items-center gap-3 pt-3 mt-1 border-t border-border/50">
              <div className="w-9 h-9 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-success" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">Amount Paid</p>
                <p className="text-sm font-bold text-foreground">₹{bookingState.total}</p>
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
