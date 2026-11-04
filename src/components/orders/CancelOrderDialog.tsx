import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarClock, ChevronRight, Loader2, XCircle } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLabOpenDays } from "@/hooks/useLabOpenDays";
import { FIXED_COLLECTION_SLOTS, findFixedSlot, isFixedSlotBookable } from "@/lib/lab-slots";
import { CANCEL_REASONS, rescheduleSlotState } from "@/lib/booking-changes";
import { COLLECTION_SLOTS } from "../../../supabase/functions/_shared/slot-capacity";
import { nextRescheduleDate, type LabDays } from "../../../supabase/functions/_shared/booking-window";

interface CancelOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  /** The lab's account id on the order; gives the lab's open days and free places. */
  vendorId?: string | null;
  labId?: string | null;
  /** The booking as it stands, so the same slot isn't offered again. */
  currentDate?: string | null;
  currentSlot?: string | null;
  /** notify parent so it can refresh order */
  onSuccess: (mode: "rescheduled" | "cancelled") => void;
}

// Today plus the next 7 days, the window the server accepts.
const DAY_COUNT = 8;

/** The server's own message for a failed call, e.g. "A collection partner is already assigned…". */
async function functionError(error: unknown, data: unknown): Promise<string> {
  const fromData = (data as { error?: string } | null)?.error;
  if (fromData) return fromData;
  const response = (error as { context?: Response } | null)?.context;
  if (response && typeof response.json === "function") {
    const body = await response.json().catch(() => null);
    if (body?.error) return String(body.error);
  }
  return "Please try again.";
}

const CancelOrderDialog = ({
  open,
  onOpenChange,
  orderId,
  vendorId,
  labId,
  currentDate,
  currentSlot,
  onSuccess,
}: CancelOrderDialogProps) => {
  const [step, setStep] = useState<"choose" | "reschedule" | "cancel">("choose");
  const [slotId, setSlotId] = useState<string | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { dates, openByOffset, availabilityByDate, isLoading: scheduleLoading, scheduleKnown, scheduleFailed } =
    useLabOpenDays(labId, vendorId, DAY_COUNT);
  const currentSlotId = findFixedSlot(currentSlot)?.id ?? null;
  // Only the lab's own saved schedule is offered; nothing is assumed while it loads.
  const scheduleReady = scheduleKnown && !scheduleFailed;

  const slotState = (index: number, slot: (typeof FIXED_COLLECTION_SLOTS)[number]) => {
    const fullDate = dates[index]?.fullDate;
    return rescheduleSlotState({
      started: !isFixedSlotBookable(slot, index),
      isCurrentBooking: fullDate === currentDate && slot.id === currentSlotId,
      availability: fullDate ? availabilityByDate[fullDate]?.[slot.id] : undefined,
    });
  };

  // A booking moves only to the next day after it that the lab is open and has a
  // free time; the server checks the same rule with the same function.
  const labDays = useMemo<LabDays>(() => {
    const days: LabDays = {};
    if (!scheduleReady) return days;
    dates.forEach((d, index) => {
      if (openByOffset[index] !== true) return;
      days[d.fullDate] = COLLECTION_SLOTS.map((s) => {
        const availability = availabilityByDate[d.fullDate]?.[s.id];
        return { normalized: s.normalized, remaining: availability?.capacity ? availability.remaining ?? 0 : 0 };
      });
    });
    return days;
  }, [dates, openByOffset, availabilityByDate, scheduleReady]);
  const targetDate = scheduleReady ? nextRescheduleDate(currentDate, labDays) : null;
  const dateIndex = targetDate ? dates.findIndex((d) => d.fullDate === targetDate) : -1;
  const targetDay = dateIndex >= 0 ? dates[dateIndex] : null;

  const reset = () => {
    setStep("choose");
    setSlotId(null);
    setReason(null);
    setSubmitting(false);
  };

  const close = () => {
    if (submitting) return;
    onOpenChange(false);
    setTimeout(reset, 200);
  };

  const submitReschedule = async () => {
    const day = targetDay;
    const slot = FIXED_COLLECTION_SLOTS.find((s) => s.id === slotId);
    if (!day || !slot) {
      toast.error("Please pick a time");
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("reschedule-order", {
      body: { orderId, scheduledDate: day.fullDate, scheduledTimeSlot: slot.display },
    });
    if (error || (data as { error?: string } | null)?.error) {
      setSubmitting(false);
      toast.error("Couldn't reschedule", { description: await functionError(error, data) });
      return;
    }
    toast.success("Booking rescheduled", { description: `${day.day}, ${day.date} ${day.month} · ${slot.time}` });
    setSubmitting(false);
    onSuccess("rescheduled");
    close();
  };

  const submitCancel = async () => {
    if (!reason) {
      toast.error("Please choose a reason");
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("cancel-order", { body: { orderId, reason } });
    if (error || (data as { error?: string } | null)?.error) {
      setSubmitting(false);
      toast.error("Couldn't cancel", { description: await functionError(error, data) });
      return;
    }
    toast.success("Booking cancelled", { description: "The lab has been told." });
    setSubmitting(false);
    onSuccess("cancelled");
    close();
  };

  const slide = { initial: { opacity: 0, x: 20 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -20 } };

  return (
    <Drawer open={open} onOpenChange={(v) => (v ? onOpenChange(true) : close())}>
      <DrawerContent className="max-w-md mx-auto p-0 overflow-hidden">
        <AnimatePresence mode="wait">
          {step === "choose" && (
            <motion.div key="choose" {...slide} className="p-5">
              <DrawerHeader className="text-left mb-3 p-0">
                <DrawerTitle className="text-xl">Change your booking</DrawerTitle>
                <DrawerDescription>Free until a collection partner is assigned.</DrawerDescription>
              </DrawerHeader>

              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => setStep("reschedule")}
                  className="w-full flex items-center gap-3 p-3.5 rounded-2xl border border-border text-left active:scale-[0.98] transition-transform"
                >
                  <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-primary/10 text-primary">
                    <CalendarClock className="w-5 h-5" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-semibold text-sm text-foreground">Reschedule</span>
                    <span className="block text-xs text-muted-foreground mt-0.5">Pick another date and time</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </button>
                <button
                  type="button"
                  onClick={() => setStep("cancel")}
                  className="w-full flex items-center gap-3 p-3.5 rounded-2xl border border-border text-left active:scale-[0.98] transition-transform"
                >
                  <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-destructive/10 text-destructive">
                    <XCircle className="w-5 h-5" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-semibold text-sm text-foreground">Cancel booking</span>
                    <span className="block text-xs text-muted-foreground mt-0.5">The lab will be told</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </button>
              </div>

              <Button variant="ghost" className="w-full mt-3" onClick={close}>
                Keep booking
              </Button>
            </motion.div>
          )}

          {step === "reschedule" && (
            <motion.div key="reschedule" {...slide} className="p-5">
              <DrawerHeader className="text-left mb-3 p-0">
                <DrawerTitle className="text-xl">Move to the next open day</DrawerTitle>
                <DrawerDescription>No charge for rescheduling.</DrawerDescription>
              </DrawerHeader>

              {!scheduleReady ? (
                <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border px-4 text-center">
                  {scheduleLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">Loading the lab's collection times…</p>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Couldn't load the lab's collection times. Please check your connection and try again.
                    </p>
                  )}
                </div>
              ) : !targetDay ? (
                <div className="flex min-h-[160px] items-center justify-center rounded-2xl border border-dashed border-border px-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    The lab has no free collection times on its next open days. Please contact support to change this booking.
                  </p>
                </div>
              ) : (
              <>
              <div className="flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3">
                <span className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <span className="text-[10px] font-semibold leading-none">{targetDay.day}</span>
                  <span className="text-base font-bold leading-tight">{targetDay.date}</span>
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-foreground">{`${targetDay.day}, ${targetDay.date} ${targetDay.month}`}</span>
                  <span className="block text-xs text-muted-foreground">The next day the lab is open with free times. Pick a time.</span>
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-4" role="radiogroup" aria-label="Time">
                {FIXED_COLLECTION_SLOTS.map((slot) => {
                    const state = slotState(dateIndex, slot);
                    const selected = slotId === slot.id;
                    return (
                      <button
                        key={slot.id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        disabled={state.disabled}
                        onClick={() => setSlotId(slot.id)}
                        className={`py-2.5 px-2 rounded-xl border text-xs font-semibold transition-colors ${
                          selected
                            ? "border-primary bg-primary text-primary-foreground"
                            : state.disabled
                              ? "border-border bg-muted text-muted-foreground opacity-60"
                              : "border-border bg-background text-foreground"
                        }`}
                      >
                        {slot.time}
                        {state.note && <span className="block mt-0.5 text-[10px] font-medium">{state.note}</span>}
                      </button>
                    );
                  })}
              </div>
              </>
              )}

              <p className="mt-4 text-xs text-muted-foreground">
                Follow your test's fasting and preparation instructions before the new time.
              </p>

              <div className="flex gap-2 mt-4">
                <Button variant="outline" className="flex-1" onClick={() => setStep("choose")} disabled={submitting}>
                  Back
                </Button>
                <Button className="flex-1" onClick={submitReschedule} disabled={submitting || !targetDay || !slotId}>
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm"}
                </Button>
              </div>
            </motion.div>
          )}

          {step === "cancel" && (
            <motion.div key="cancel" {...slide} className="p-5">
              <DrawerHeader className="text-left mb-3 p-0">
                <DrawerTitle className="text-xl">Cancel this booking?</DrawerTitle>
                <DrawerDescription>Cancelling is free. Tell us why, so the lab knows.</DrawerDescription>
              </DrawerHeader>

              <div className="space-y-2" role="radiogroup" aria-label="Reason">
                {CANCEL_REASONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    role="radio"
                    aria-checked={reason === r}
                    onClick={() => setReason(r)}
                    className={`w-full text-left px-3.5 py-3 rounded-xl border text-sm font-medium transition-colors ${
                      reason === r ? "border-destructive bg-destructive/5 text-foreground" : "border-border bg-background text-foreground"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>

              <div className="flex gap-2 mt-5">
                <Button variant="outline" className="flex-1" onClick={() => setStep("choose")} disabled={submitting}>
                  Keep booking
                </Button>
                <Button variant="destructive" className="flex-1" onClick={submitCancel} disabled={submitting || !reason}>
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Cancel booking"}
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
