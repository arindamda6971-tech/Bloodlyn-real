import { useEffect, useRef, useState } from "react";
import { Check, X, Loader2, Clock, Phone, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { PartnerCallButton } from "@/components/orders/PartnerCallButton";

interface CollectionConfirmPromptProps {
  orderId: string;
  scheduledDate: string | null;
  scheduledTimeSlot: string | null;
  /** The assigned partner; calling him goes through BloodLyn (never his number). */
  partnerName?: string | null;
  serviceType?: "blood" | "vitals";
  onConfirmed: (status: string) => void;
}

const CollectionConfirmPrompt = ({
  orderId,
  scheduledDate,
  scheduledTimeSlot,
  partnerName,
  serviceType = "blood",
  onConfirmed,
}: CollectionConfirmPromptProps) => {
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
  const hasPartner = !!partnerName?.trim();

  // The collection code, made when the lab assigned the partner (blood collections only).
  // A new partner gets a new code, so it's read again when the partner changes.
  const [code, setCode] = useState<string | null>(null);
  useEffect(() => {
    if (serviceType !== "blood" || !hasPartner) return setCode(null);
    let cancelled = false;
    (async () => {
      try {
        // Not in the generated types yet.
        const table = supabase.from("collection_codes" as never) as unknown as {
          select: (columns: string) => { eq: (column: string, value: string) => { maybeSingle: () => Promise<{ data: unknown }> } };
        };
        const { data } = await table
          .select("code, used_at")
          .eq("order_id", orderId)
          .maybeSingle();
        const row = data as { code?: string; used_at?: string | null } | null;
        if (!cancelled) setCode(row?.code && !row.used_at ? row.code : null);
      } catch {
        if (!cancelled) setCode(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId, serviceType, hasPartner, partnerName]);

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

  const submit = async (action: "collected" | "not_collected") => {
    setSubmitting(true);
    setErrorMessage("");
    try {
      const newStatus = action === "collected"
        ? serviceType === "vitals" ? "completed" : "sample_collected"
        : "collection_pending";

      if (serviceType === "vitals" && action === "collected") {
        const { data, error } = await supabase.functions.invoke("confirm-vitals-service", {
          body: { orderId },
        });
        const payload = (data ?? {}) as { success?: boolean; status?: string; error?: string };
        if (error || !payload.success) {
          let message = payload.error || "Could not complete your service. Please try again.";
          const response = (error as unknown as { context?: Response })?.context;
          if (response) {
            const body = await response.json().catch(() => null);
            message = body?.error || message;
          }
          throw new Error(message);
        }
        toast.success("Thanks! Your service is complete.");
        onConfirmed(payload.status || "completed");
        return;
      }

      // Status changes go through the server: the orders table refuses them
      // from the app (guard_order_booking_fields). No PIN is asked for.
      const { data: funcData, error: funcError } = await supabase.functions.invoke("confirm-collection", {
        body: { orderId, action },
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
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not update your order. Please try again.";
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-2 rounded-2xl border border-primary/25 bg-primary/5 p-3">
      <p className="text-sm font-semibold text-foreground">
        {serviceType === "vitals"
          ? "Was your BP or ECG check completed by our partner?"
          : code
            ? "Your collection code"
            : "Is your blood collected by our partner?"}
      </p>

      {errorMessage && (
        <div className="bg-destructive/10 text-destructive text-xs p-2.5 rounded-lg font-medium text-center border border-destructive/20 mt-2">
          {errorMessage}
        </div>
      )}

      {/* The partner confirms the collection by entering this code: no "Yes" for the patient. */}
      {code && !missed ? <div className="mt-3">
        <div className="rounded-xl bg-background p-3 text-center ring-1 ring-primary/20">
          <p className="font-mono text-3xl font-bold tracking-[0.4em] text-primary pl-[0.4em]" aria-label={`Collection code ${code.split("").join(" ")}`}>{code}</p>
          <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
            Give this code to your collection partner only after he has collected your sample. He enters it to confirm.
          </p>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="mt-2 h-8 w-full rounded-xl text-xs text-muted-foreground"
          disabled={!canReportMissed}
          onClick={() => { setErrorMessage(""); setMissed(true); }}
        >
          Partner didn't come?
        </Button>
      </div> : !missed ? <div className="flex gap-2 mt-3">
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
        {/* Through BloodLyn, so the partner's number is never shown or dialled. */}
        {hasPartner ? <PartnerCallButton orderId={orderId} partnerName={partnerName} variant="button" className="flex-1" /> : <Button size="sm" variant="outline" disabled className="flex-1 gap-1.5"><Phone className="w-4 h-4" />Call Partner</Button>}
        <Button size="sm" variant="destructive" className="flex-1 gap-1.5" onClick={() => setReportOpen(true)}><Flag className="w-4 h-4" />Report Lab</Button>
        {!hasPartner && <p className="text-xs text-muted-foreground basis-full">The lab hasn't assigned a partner yet.</p>}
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
          {code ? "If the partner doesn't come, you can report it once your booked slot ends." : "You can select “No” once your booked slot ends."}
        </p>
      )}
    </div>
  );
};

export default CollectionConfirmPrompt;
