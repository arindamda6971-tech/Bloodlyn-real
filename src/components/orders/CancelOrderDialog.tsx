import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, CalendarClock, Wallet, X, ChevronRight, Loader2, CheckCircle2 } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLabOpenDays } from "@/hooks/useLabOpenDays";
import { FIXED_COLLECTION_SLOTS } from "@/lib/lab-slots";
import { format, addDays } from "date-fns";

type Reason = "preparation" | "reschedule" | "not_now";

interface CancelOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  orderTotal: number;
  userId: string;
  /** raw order status — used to disable "I don't want it right now" once a partner is assigned */
  orderStatus: string | null;
  /** time slots from lab/order workflow; falls back to standard slots */
  availableTimeSlots?: string[];
  /** notify parent so it can refresh order */
  onSuccess: (mode: "rescheduled" | "cancelled") => void;
  labId?: string | null;
}

const DEFAULT_SLOTS = FIXED_COLLECTION_SLOTS.map((s) => s.display);

const REASONS: { key: Reason; title: string; subtitle: string; icon: any; tone: string }[] = [
  {
    key: "preparation",
    title: "Forgot to maintain preparation",
    subtitle: "Reschedule to a date when you can prepare properly",
    icon: AlertTriangle,
    tone: "text-amber-600 bg-amber-50 dark:bg-amber-950/40",
  },
  {
    key: "reschedule",
    title: "Extend order to another date",
    subtitle: "Pick a new date and time slot that works for you",
    icon: CalendarClock,
    tone: "text-primary bg-primary/10",
  },
  {
    key: "not_now",
    title: "I don't want it right now",
    subtitle: "Refund will be added to your wallet for next order",
    icon: Wallet,
    tone: "text-success bg-success/10",
  },
];

const CancelOrderDialog = ({
  open,
  onOpenChange,
  orderId,
  orderTotal,
  userId,
  orderStatus,
  availableTimeSlots,
  onSuccess,
  labId,
}: CancelOrderDialogProps) => {
  const [step, setStep] = useState<"choose" | "reschedule" | "wallet-confirm" | "preparation-confirm">("choose");
  const [reason, setReason] = useState<Reason | null>(null);
  const [date, setDate] = useState<Date | undefined>(addDays(new Date(), 1));
  const [slot, setSlot] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { dates, openByOffset, scheduleKnown } = useLabOpenDays(labId, null, 7);

  // Once the lab assigns a collection partner the user cannot get a wallet refund
  const partnerAssigned = useMemo(() => {
    const s = (orderStatus || "").toLowerCase();
    return ["assigned", "out_for_collection", "processing", "sample_collected", "in_progress",
            "collection_complete", "sample_received", "lab_processing", "report_ready",
            "report_delivered", "completed"].includes(s);
  }, [orderStatus]);

  const slots = availableTimeSlots && availableTimeSlots.length > 0 ? availableTimeSlots : DEFAULT_SLOTS;

  const reset = () => {
    setStep("choose");
    setReason(null);
    setSlot(null);
    setDate(addDays(new Date(), 1));
    setSubmitting(false);
  };

  const close = () => {
    if (submitting) return;
    onOpenChange(false);
    setTimeout(reset, 200);
  };

  const submitReschedule = async (targetDate: Date, targetSlot: string) => {
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("orders")
        .update({
          scheduled_date: format(targetDate, "yyyy-MM-dd"),
          scheduled_time_slot: targetSlot,
        })
        .eq("id", orderId)
        .eq("user_id", userId);
      if (error) throw error;
      toast.success("Order rescheduled successfully", {
        description: `${format(targetDate, "MMM dd, yyyy")} • ${targetSlot}`,
      });
      onSuccess("rescheduled");
      close();
    } catch (e: any) {
      toast.error("Could not reschedule", { description: e.message ?? "Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  const nextAvailableDate = useMemo(() => {
    let offset = 1; // default tomorrow
    for (let i = 1; i < dates.length; i++) {
      if (!scheduleKnown || openByOffset[i]) {
        offset = i;
        break;
      }
    }
    return addDays(new Date(), offset);
  }, [dates, scheduleKnown, openByOffset]);

  const handlePreparationConfirm = async () => {
    if (!slot) {
      toast.error("Please select a time slot");
      return;
    }
    await submitReschedule(nextAvailableDate, slot);
  };

  const handleReasonSelect = (r: Reason) => {
    setReason(r);
    if (r === "preparation") {
      setSlot(slots[0] || null);
      setStep("preparation-confirm");
    } else if (r === "reschedule") {
      setStep("reschedule");
    } else {
      setStep("wallet-confirm");
    }
  };

  const handleReschedule = () => {
    if (!slot) {
      toast.error("Please select a date and time slot");
      return;
    }
    submitReschedule(nextAvailableDate, slot);
  };

  const handleWalletRefund = async () => {
    setSubmitting(true);
    try {
      // 1. Cancel the order (RLS allows transition to 'cancelled' on pending/confirmed)
      const { error: cancelErr } = await supabase
        .from("orders")
        .update({ status: "cancelled", cancellation_reason: "User requested wallet refund", cancelled_at: new Date().toISOString() })
        .eq("id", orderId)
        .eq("user_id", userId);
      if (cancelErr) throw cancelErr;

      // 2. Read current wallet balance
      const { data: profile } = await supabase
        .from("profiles")
        .select("wallet_balance")
        .eq("id", userId)
        .maybeSingle();
      const current = Number(profile?.wallet_balance ?? 0);
      const newBalance = current + Number(orderTotal);

      // 3. Update wallet
      const { error: walletErr } = await supabase
        .from("profiles")
        .update({ wallet_balance: newBalance })
        .eq("id", userId);
      if (walletErr) throw walletErr;

      // 4. Insert ledger entry
      await supabase.from("wallet_transactions").insert({
        user_id: userId,
        amount: Number(orderTotal),
        type: "credit",
        description: `Refund for cancelled order`,
        order_id: orderId,
        balance_after: newBalance,
      });

      toast.success("Order cancelled & wallet credited", {
        description: `₹${orderTotal} added to your wallet`,
      });
      onSuccess("cancelled");
      close();
    } catch (e: any) {
      toast.error("Could not cancel order", { description: e.message ?? "Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={(v) => (v ? onOpenChange(true) : close())}>
      <DrawerContent className="max-w-md mx-auto p-0 overflow-hidden">
        <AnimatePresence mode="wait">
          {step === "choose" && (
            <motion.div
              key="choose"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-6"
            >
              <DrawerHeader className="text-left mb-4">
                <DrawerTitle className="text-xl">Cancel Order</DrawerTitle>
                <DrawerDescription>
                  Tell us why so we can help you better.
                </DrawerDescription>
              </DrawerHeader>

              <div className="space-y-2.5">
                {REASONS.map((r) => {
                  const disabled = r.key === "not_now" && partnerAssigned;
                  const Icon = r.icon;
                  return (
                    <button
                      key={r.key}
                      onClick={() => !disabled && handleReasonSelect(r.key)}
                      disabled={disabled}
                      className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all ${
                        disabled
                          ? "border-border opacity-50 cursor-not-allowed"
                          : "border-border hover:border-primary hover:bg-primary/5 active:scale-[0.98]"
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${r.tone}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-foreground">{r.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {disabled ? "Not available — collection partner already assigned" : r.subtitle}
                        </p>
                      </div>
                      {!disabled && <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>

              <Button variant="ghost" className="w-full mt-4" onClick={close}>
                Keep Order
              </Button>
            </motion.div>
          )}

          {step === "preparation-confirm" && (
            <motion.div
              key="preparation-confirm"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="p-6"
            >
              <DrawerHeader className="text-left mb-4 p-0">
                <DrawerTitle className="text-xl">Preparation Required</DrawerTitle>
                <DrawerDescription>
                  Review the terms for rescheduling due to preparation.
                </DrawerDescription>
              </DrawerHeader>

              <div className="rounded-2xl border border-border p-4 mb-5 text-sm text-muted-foreground bg-muted/50">
                <p className="font-semibold text-foreground mb-2">Terms & Conditions</p>
                <ul className="list-disc pl-4 space-y-1 mb-4">
                  <li>Your order will be automatically rescheduled to the next available lab opening day.</li>
                  <li>Ensure you follow all fasting or preparation guidelines before the new scheduled time.</li>
                </ul>

                <p className="font-semibold text-foreground mb-2">
                  Select your preferred time slot for <span className="text-primary">{format(nextAvailableDate, "MMM dd")}</span>:
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {slots.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSlot(s)}
                      className={`py-2 px-3 rounded-xl text-xs font-medium border transition-all ${
                        slot === s
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-foreground hover:border-primary/50"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep("choose")} disabled={submitting}>
                  Back
                </Button>
                <Button className="flex-1" onClick={handlePreparationConfirm} disabled={submitting}>
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm & Reschedule"}
                </Button>
              </div>
            </motion.div>
          )}

          {step === "reschedule" && (
            <motion.div
              key="reschedule"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="p-6"
            >
              <DrawerHeader className="text-left mb-4">
                <DrawerTitle className="text-xl">Pick a new date & time</DrawerTitle>
                <DrawerDescription>
                  Your order will be rescheduled — no charges, no wallet refund.
                </DrawerDescription>
              </DrawerHeader>



              <div className="mb-4">
                <p className="font-semibold text-foreground mb-2">
                  Select your preferred time slot for <span className="text-primary">{format(nextAvailableDate, "MMM dd")}</span>:
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {slots.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSlot(s)}
                      className={`py-2.5 px-3 rounded-xl text-xs font-medium border transition-all ${
                        slot === s
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-foreground hover:border-primary/50"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-border p-4 mb-5 text-sm text-muted-foreground bg-muted/50">
                <p className="font-semibold text-foreground mb-2">Terms & Conditions</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Your order will be rescheduled to your newly selected date and time slot.</li>
                  <li>Ensure you follow all fasting or preparation guidelines before the new scheduled time.</li>
                </ul>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep("choose")} disabled={submitting}>
                  Back
                </Button>
                <Button className="flex-1" onClick={handleReschedule} disabled={submitting || !date || !slot}>
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Reschedule"}
                </Button>
              </div>
            </motion.div>
          )}

          {step === "wallet-confirm" && (
            <motion.div
              key="wallet"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="p-6"
            >
              <div className="flex flex-col items-center text-center mb-5">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  className="w-16 h-16 rounded-full bg-success/15 flex items-center justify-center mb-3"
                >
                  <Wallet className="w-8 h-8 text-success" />
                </motion.div>
                <DrawerTitle className="text-xl">Refund to your wallet</DrawerTitle>
                <DrawerDescription className="mt-2 max-w-sm">
                  Your money will be added to your wallet. You can use it on your next order.
                </DrawerDescription>
              </div>

              <div className="rounded-2xl bg-gradient-to-br from-success/10 to-primary/10 p-5 mb-5 border border-success/20">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Refund amount</span>
                  <span className="text-2xl font-bold text-success">₹{orderTotal}</span>
                </div>
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-success/20">
                  <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
                  <span className="text-xs text-muted-foreground">Instant credit • No expiry • Use anytime</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep("choose")} disabled={submitting}>
                  Back
                </Button>
                <Button className="flex-1 bg-success hover:bg-success/90 text-white" onClick={handleWalletRefund} disabled={submitting}>
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm & Get Refund"}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DrawerContent>
    </Drawer>
  );
};

export default CancelOrderDialog;
