import { useEffect, useRef, useState } from "react";
import { Check, X, Loader2, Clock, Phone, Flag } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";

interface CollectionConfirmPromptProps {
  orderId: string;
  scheduledDate: string | null;
  scheduledTimeSlot: string | null;
  partnerPhone?: string | null;
  onConfirmed: (status: string) => void;
}

const CollectionConfirmPrompt = ({
  orderId,
  scheduledDate,
  scheduledTimeSlot,
  partnerPhone,
  onConfirmed,
}: CollectionConfirmPromptProps) => {
  const [pinOpen, setPinOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [missed, setMissed] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [reporting, setReporting] = useState(false);
  const reportLock = useRef(false);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const canReportMissed = hasCollectionWindowEnded(scheduledDate, scheduledTimeSlot, now);
  const phone = partnerPhone?.replace(/[^\d+]/g, "") ?? "";

  const report = async () => {
    if (reportLock.current || !canReportMissed || comment.trim().length < 3) return;
    reportLock.current = true;
    setReporting(true);
    setErrorMessage("");
    try {
      const { data, error } = await supabase.functions.invoke("report-no-show", { body: { orderId, comment: comment.trim() } });
      if (error || !data?.success) {
        let message = data?.error || "Could not report your order. Please try again.";
        const response = (error as unknown as { context?: Response })?.context;
        if (response) {
          const payload = await response.json().catch(() => null);
          message = payload?.error || message;
        }
        throw new Error(message);
      }
      toast.success(data.partner_synced ? "Order cancelled. Your report has been sent to the lab." : "Order cancelled and report saved. Lab notification is pending.");
      setReportOpen(false);
      onConfirmed("cancelled");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not report your order. Please try again.");
    } finally {
      setReporting(false);
      reportLock.current = false;
    }
  };

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

      {!missed ? <div className="flex gap-2 mt-3">
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
          onClick={() => { setErrorMessage(""); setMissed(true); }}
        >
          <X className="w-4 h-4" strokeWidth={3} />
          No
        </Button>
      </div> : <div className="flex flex-wrap gap-2 mt-3">
        {phone ? <Button asChild size="sm" variant="outline" className="flex-1 gap-1.5"><a href={`tel:${phone}`}><Phone className="w-4 h-4" />Call Partner</a></Button> : <Button size="sm" variant="outline" disabled className="flex-1 gap-1.5"><Phone className="w-4 h-4" />Call Partner</Button>}
        <Button size="sm" variant="destructive" className="flex-1 gap-1.5" onClick={() => setReportOpen(true)}><Flag className="w-4 h-4" />Report Lab</Button>
        {!phone && <p className="text-xs text-muted-foreground basis-full">Partner phone number is unavailable.</p>}
        <Button size="sm" variant="ghost" onClick={() => setMissed(false)}>Back</Button>
      </div>}

      <Dialog open={reportOpen} onOpenChange={(open) => { if (!reporting) setReportOpen(open); }}>
        <DialogContent className="max-w-sm" onEscapeKeyDown={(event) => { if (reporting) event.preventDefault(); }} onInteractOutside={(event) => { if (reporting) event.preventDefault(); }}>
          <DialogHeader><DialogTitle>Report Lab</DialogTitle><DialogDescription>Submitting your report cancels this order and records a strike against the lab.</DialogDescription></DialogHeader>
          <label htmlFor={`no-show-comment-${orderId}`} className="text-sm font-medium">Comment</label>
          <Textarea id={`no-show-comment-${orderId}`} value={comment} onChange={(event) => setComment(event.target.value)} maxLength={1000} disabled={reporting} placeholder="Tell us what happened" />
          {errorMessage && <p role="alert" className="text-sm text-destructive">{errorMessage}</p>}
          <div className="flex justify-end gap-2"><Button variant="outline" disabled={reporting} onClick={() => setReportOpen(false)}>Keep order</Button><Button variant="destructive" disabled={reporting || comment.trim().length < 3 || !canReportMissed} onClick={report}>{reporting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Submit report</Button></div>
        </DialogContent>
      </Dialog>

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
