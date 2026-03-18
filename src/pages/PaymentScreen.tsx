import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Tag, CreditCard, Wallet, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import MobileLayout from "@/components/layout/MobileLayout";
import ScreenHeader from "@/components/layout/ScreenHeader";
import { useCart } from "@/contexts/CartContext";

const paymentMethods = [
  { id: "cash", icon: Wallet, name: "Cash on Delivery", subtitle: "Pay when sample is collected" },
];

interface PaymentState {
  cartItems: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    familyMemberId?: string;
    packageId?: string;
  }>;
  addressId: string | null;
  scheduledDate: string | null;
  scheduledTimeSlot: string | null;
  subtotal: number;
  // optional patient info forwarded from cart
  patientName?: string;
  patientAge?: number | string | null;
  patientGender?: string | null;
  patientPhone?: string | null;
}

const PaymentScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { subtotal } = useCart();
  const [couponCode, setCouponCode] = useState("");
  const [selectedPayment, setSelectedPayment] = useState("cash");
  const [couponApplied, setCouponApplied] = useState(false);

  const paymentState = location.state as PaymentState | undefined;
  const stateSubtotal = paymentState?.subtotal || subtotal;




  const discount = couponApplied ? 100 : 0;
  const total = stateSubtotal - discount;

  const applyCoupon = () => {
    if (couponCode.toUpperCase() === "HEALTH100") {
      setCouponApplied(true);
    }
  };

  const handlePayment = () => {
    // NOTE: real payment gateway integration is required for non-cash methods.
    // We only mark `paymentVerified` for cash-on-delivery here. Non-cash
    // flows must set `paymentVerified: true` after confirmation by the
    // payment provider (webhook / client verification).
    const paymentVerified = selectedPayment === 'cash';

    navigate("/order-success", {
      state: {
        ...paymentState,
        couponApplied,
        discount,
        total,
        selectedPayment,
        paymentVerified,
      }
    });
  };

  return (
    <MobileLayout>
      <ScreenHeader title="Payment" />

      <div className="px-4 pb-32">
        {/* Coupon section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="soft-card mt-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <Tag className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Apply Coupon</h3>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Enter coupon code"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              className="flex-1 bg-muted border-0 rounded-xl"
            />
            <Button
              variant="soft"
              onClick={applyCoupon}
              disabled={couponApplied}
            >
              {couponApplied ? "Applied" : "Apply"}
            </Button>
          </div>
          {couponApplied && (
            <Badge variant="softSuccess" className="mt-2">
              Coupon HEALTH100 applied - ₹100 off
            </Badge>
          )}
        </motion.div>



        {/* Payment methods */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6"
        >
          <h3 className="font-semibold text-foreground mb-3">Payment Method</h3>
          <div className="space-y-2">
            {paymentMethods.map((method) => (
              <button
                key={method.id}
                onClick={() => setSelectedPayment(method.id)}
                className={`w-full soft-card flex items-center gap-4 transition-all ${
                  selectedPayment === method.id
                    ? "ring-2 ring-primary"
                    : ""
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <method.icon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-foreground text-sm">{method.name}</p>
                  <p className="text-xs text-muted-foreground">{method.subtitle}</p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 ${
                  selectedPayment === method.id
                    ? "border-primary bg-primary"
                    : "border-muted-foreground"
                } flex items-center justify-center`}>
                  {selectedPayment === method.id && (
                    <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Online payments notice */}
        <div className="mt-3 px-3 py-2 rounded-md bg-muted border border-border text-xs text-muted-foreground">
          Online payment options (UPI, Cards, Wallets) coming soon.
        </div>

        {/* Price breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="soft-card mt-6"
        >
          <h3 className="font-semibold text-foreground mb-3">Price Details</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="text-foreground">₹{stateSubtotal}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Home Collection</span>
              <span className="text-success">FREE</span>
            </div>
            {couponApplied && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Coupon Discount</span>
                <span className="text-success">-₹{discount}</span>
              </div>
            )}
            <div className="h-px bg-border my-3" />
            <div className="flex justify-between">
              <span className="font-semibold text-foreground">Total</span>
              <span className="font-bold text-lg text-foreground">₹{total}</span>
            </div>
          </div>
          <Badge variant="softSuccess" className="mt-3">
            No hidden charges
          </Badge>
        </motion.div>
      </div>

      {/* Bottom CTA */}
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="fixed bottom-24 left-0 right-0 max-w-[430px] mx-auto bg-card/95 backdrop-blur-xl border-t border-border px-4 py-4 safe-area-bottom"
      >
        <Button
          variant="hero"
          className="w-full"
          size="lg"
          onClick={handlePayment}
        >
          Pay Now • ₹{total}
        </Button>
      </motion.div>
    </MobileLayout>
  );
};

export default PaymentScreen;