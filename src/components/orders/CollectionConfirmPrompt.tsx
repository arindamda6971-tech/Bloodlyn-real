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

const CollectionConfirmPrompt = ({
  orderId,
  scheduledDate,
  scheduledTimeSlot,
  onConfirmed,
}: CollectionConfirmPromptProps) => {
  const [pinOpen, setPinOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const canReportMissed = hasCollectionWindowEnded(scheduledDate, scheduledTimeSlot);

  const submit = async (action: "collected" | "not_collected", pinValue?: string) => {
    setSubmitting(true);
    try {
      const newStatus = action === "collected" ? "sample_collected" : "collection_pending";
      
      // Try Option 2 first: Direct Database Update (if RLS is enabled)
      const { data: directData, error: directError } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("id", orderId)
        .select();

      // If direct update succeeds, we are done!
      if (!directError && directData && directData.length > 0) {
        toast.success(
          action === "collected"
            ? "Thanks! Your sample collection is confirmed."
            : "We've told the lab your sample wasn't collected yet."
        );
        onConfirmed(newStatus);
        setSubmitting(false);
        return;
      }

      // If direct update fails (RLS block), fallback to Option 1: Edge Function
      const { data: funcData, error: funcError } = await supabase.functions.invoke("confirm-collection", {
        body: { orderId, action, pin: null },
      });

      const payload = (funcData ?? {}) as { success?: boolean; status?: string; error?: string };

      if (funcError || !payload.success) {
        let message = payload.error || "Could not update your order. Please try again.";
        const ctx = (funcError as unknown as { context?: Response })?.context;
        if (ctx && typeof ctx.json === "function") {
          try {
            const body = await ctx.json();
            if (body?.error) message = body.error;
          } catch {
            // keep default
          }
        }
        setErrorMessage(message);
        toast.error(message);
        return;
      }

      toast.success(
        action === "collected"
          ? "Thanks! Your sample collection is confirmed."
          : "We've told the lab your sample wasn't collected yet."
      );
      onConfirmed(payload.status || newStatus);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-2 rounded-2xl border border-primary/25 bg-primary/5 p-3">
      <p className="text-sm font-semibold text-foreground">
        Is your blood collected by our partner?
      </p>

      {errorMessage && (
        <div className="bg-destructive/10 text-destructive text-xs p-2.5 rounded-lg font-medium text-center border border-destructive/20 mt-2">
          {errorMessage}
        </div>
      )}

      <div className="flex gap-2 mt-3">
        <Button
          size="sm"
          className="h-9 flex-1 rounded-xl gap-1.5"
          disabled={submitting}
          onClick={() => submit("collected")}
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" strokeWidth={3} />}
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
  );
};

export default CollectionConfirmPrompt;
