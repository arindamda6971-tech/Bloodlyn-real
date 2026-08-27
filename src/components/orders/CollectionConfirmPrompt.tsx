import { useState } from "react";
import { Check, X, Loader2, ShieldCheck, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { hasCollectionWindowEnded } from "@/lib/lab-slots";

interface CollectionConfirmPromptProps {
  orderId: string;
  scheduledDate: string | null;
  scheduledTimeSlot: string | null;
  onConfirmed: (status: string) => void;
}

/**
 * Tracking-tile prompt: "Is your blood collected by our partner?"
 *
 * Yes → asks for the collection partner's PIN, then marks the order collected
 *       (and the lab's booking tile updates automatically).
 * No  → only clickable once the booked slot window has ended; marks the order
 *       as collection pending for the lab.
 */
const CollectionConfirmPrompt = ({
  orderId,
  scheduledDate,
  scheduledTimeSlot,
  onConfirmed,
}: CollectionConfirmPromptProps) => {
  const [pinOpen, setPinOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canReportMissed = hasCollectionWindowEnded(scheduledDate, scheduledTimeSlot);

  const submit = async (action: "collected" | "not_collected", pinValue?: string) => {
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("confirm-collection", {
        body: { orderId, action, pin: pinValue ?? null },
      });

      const payload = (data ?? {}) as { success?: boolean; status?: string; error?: string };

      if (error || !payload.success) {
        let message = payload.error || "Could not update your order. Please try again.";
        // Edge functions return the reason in the response body on 4xx.
        const ctx = (error as unknown as { context?: Response })?.context;
        if (ctx && typeof ctx.json === "function") {
          try {
            const body = await ctx.json();
            if (body?.error) message = body.error;
          } catch {
            /* keep default */
          }
        }
        toast.error(message);
        return;
      }

      setPinOpen(false);
      setPin("");
      toast.success(
        action === "collected"
          ? "Thanks! Your sample collection is confirmed."
          : "We've told the lab your sample wasn't collected yet."
      );
      onConfirmed(payload.status || (action === "collected" ? "sample_collected" : "collection_pending"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="mt-2 rounded-2xl border border-primary/25 bg-primary/5 p-3">
        <p className="text-sm font-semibold text-foreground">
          Is your blood collected by our partner?
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Confirm with the PIN shared by your collection partner.
        </p>

        <div className="flex gap-2 mt-3">
          <Button
            size="sm"
            className="h-9 flex-1 rounded-xl gap-1.5"
            disabled={submitting}
            onClick={() => setPinOpen(true)}
          >
            <Check className="w-4 h-4" strokeWidth={3} />
            Yes
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-9 flex-1 rounded-xl gap-1.5"
            disabled={submitting || !canReportMissed}
            onClick={() => submit("not_collected")}
          >
            <X className="w-4 h-4" strokeWidth={3} />
            No
          </Button>
        </div>

        {!canReportMissed && (
          <p className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            You can select “No” once your booked slot ends.
          </p>
        )}
      </div>

      <Dialog open={pinOpen} onOpenChange={(o) => !submitting && setPinOpen(o)}>
        <DialogContent className="max-w-[340px] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="w-5 h-5 text-primary" />
              Enter collection PIN
            </DialogTitle>
            <DialogDescription className="text-xs">
              Ask your collection partner for their PIN and enter it here to confirm the
              sample collection.
            </DialogDescription>
          </DialogHeader>

          <Input
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            placeholder="4-digit PIN"
            className="h-12 text-center text-lg font-bold tracking-[0.4em]"
            aria-label="Collection partner PIN"
          />

          <Button
            className="w-full h-11 rounded-2xl gap-2"
            disabled={submitting || pin.length < 4}
            onClick={() => submit("collected", pin)}
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Confirm collection
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CollectionConfirmPrompt;
