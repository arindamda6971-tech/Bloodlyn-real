import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import { Building2, Calendar, Clock, FileText, Loader2, Phone, Star, Stethoscope, User, Video, Eye } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import ScreenHeader from "@/components/layout/ScreenHeader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useOrderDetails } from "@/hooks/useOrderDetails";
import { useRealtimeOrders } from "@/hooks/useRealtimeOrders";
import { useSEO } from "@/hooks/useSEO";
import { consultInfo, consultStatus } from "@/lib/doctor-orders";
import { meetInstallUrl, meetLinkOf, openMeet } from "@/lib/meet";

const STATUS = {
  upcoming: { label: "Upcoming", tone: "bg-primary/10 text-primary" },
  completed: { label: "Completed", tone: "bg-success/15 text-success" },
  cancelled: { label: "Cancelled", tone: "bg-destructive/10 text-destructive" },
  missed: { label: "Missed", tone: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
} as const;

/** The server's own message for a refused request (functions.invoke hides it in error.context). */
async function serverMessage(error: unknown, data: unknown): Promise<string | null> {
  const fromData = (data as { error?: string } | null)?.error;
  if (fromData) return fromData;
  const response = (error as { context?: Response } | null)?.context;
  if (response && typeof response.json === "function") {
    const body = await response.json().catch(() => null);
    if (body?.error) return String(body.error);
  }
  return null;
}

/** A doctor consultation: who, when, how to join, and the prescription afterwards. */
const AppointmentDetailScreen = () => {
  useSEO({ title: "Appointment | BloodLyn", description: "Your doctor consultation." });
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useOrderDetails(id);
  useRealtimeOrders();

  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [stars, setStars] = useState(0);
  const [review, setReview] = useState("");
  const [rating, setRating] = useState(false);

  if (isLoading) {
    return (
      <MobileLayout showNav={false}>
        <ScreenHeader title="Appointment" />
        <div className="px-4 space-y-3 mt-3">
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
      </MobileLayout>
    );
  }

  const order = data?.order;
  const info = order ? consultInfo(order) : null;
  if (isError || !order || !info) {
    return (
      <MobileLayout showNav={false}>
        <ScreenHeader title="Appointment" />
        <div className="px-6 py-20 text-center">
          <p className="font-bold text-foreground">Appointment not found</p>
          <Button className="mt-4 rounded-xl" onClick={() => navigate("/bookings")}>Back to My Orders</Button>
        </div>
      </MobileLayout>
    );
  }

  const status = consultStatus(order.status, order.scheduled_date);
  const statusInfo = STATUS[status];
  const ModeIcon = info.mode === "video" ? Video : info.mode === "audio" ? Phone : Building2;
  const modeLabel = info.mode === "video" ? "Video consultation" : info.mode === "audio" ? "Audio consultation" : "Clinic visit";
  const patient = info.patientName || order.patient_name || order.family_members?.full_name || "Self";
  const notes = (order.special_instructions || "").match(/Reason:\s*([^|]+)/)?.[1]?.trim() ?? "";
  const cancelledBy = /doctor/i.test(order.cancellation_reason || "") ? "the doctor" : /patient/i.test(order.cancellation_reason || "") ? "you" : null;
  const headline =
    status === "cancelled"
      ? cancelledBy
        ? `This appointment was cancelled by ${cancelledBy}.`
        : "This appointment was cancelled."
      : status === "completed"
        ? "Consultation completed."
        : status === "missed"
          ? info.mode === "clinic"
            ? "The day of this visit has passed. If you didn't see the doctor, you can book again."
            : "The doctor didn't call on the booked day. You can book again; nothing is charged for this booking."
          : info.mode === "clinic"
            ? "Please reach the clinic a few minutes before your time."
            : meetLinkOf(order)
              ? "Your doctor has started the consultation on Google Meet."
              : "When the doctor starts, your phone rings and you join on Google Meet from here. Keep BloodLyn open so you don't miss the call.";

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["order", id] });
    queryClient.invalidateQueries({ queryKey: ["orders"] });
  };

  const cancelAppointment = async () => {
    if (cancelling) return;
    setCancelling(true);
    const { data: res, error } = await supabase.functions.invoke("cancel-order", { body: { orderId: order.id } });
    setCancelling(false);
    if (error || (res as { error?: string } | null)?.error) {
      toast.error("Couldn't cancel", { description: (await serverMessage(error, res)) || "Please try again." });
      return;
    }
    setConfirmCancel(false);
    toast.success("Appointment cancelled", { description: "The doctor has been told." });
    refresh();
  };

  const submitRating = async () => {
    if (!stars || rating) return;
    setRating(true);
    const { error } = await supabase
      .from("orders")
      .update({ consult_rating: stars, consult_review: review.trim() || null, consult_rated_at: new Date().toISOString() } as never)
      .eq("id", order.id);
    setRating(false);
    if (error) {
      console.error("Couldn't save the rating", error);
      toast.error("Couldn't save your rating. Please try again.");
      return;
    }
    toast.success("Thanks for rating your consultation");
    refresh();
  };

  return (
    <MobileLayout showNav={false}>
      <ScreenHeader title="Appointment" />

      <div className="px-4 pb-8 space-y-3">
        <section className="mt-3 rounded-2xl border border-border/60 bg-card shadow-sm p-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                <ModeIcon className="w-3.5 h-3.5" /> {modeLabel}
              </p>
              <h2 className="text-lg font-extrabold text-foreground leading-tight truncate">{info.doctorName}</h2>
              {info.mode === "clinic" && order.lab_name && (
                <p className="text-xs text-muted-foreground truncate">{order.lab_name}</p>
              )}
            </div>
            <span className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold whitespace-nowrap ${statusInfo.tone}`}>
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {statusInfo.label}
            </span>
          </div>
          <p className="mt-3 text-sm text-muted-foreground leading-snug">{headline}</p>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-muted/50 px-3 py-2.5">
              <p className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground"><Calendar className="w-3 h-3" /> Date</p>
              <p className="text-sm font-bold text-foreground">
                {order.scheduled_date ? format(new Date(order.scheduled_date), "EEE, dd MMM yyyy") : "To be fixed"}
              </p>
            </div>
            <div className="rounded-xl bg-muted/50 px-3 py-2.5">
              <p className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground"><Clock className="w-3 h-3" /> Time</p>
              <p className="text-sm font-bold text-foreground truncate">{order.scheduled_time_slot || "To be fixed"}</p>
            </div>
          </div>

          {status === "upcoming" && info.mode !== "clinic" && (
            <>
              <Button
                className="mt-3 w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={!meetLinkOf(order)}
                onClick={() => {
                  const link = meetLinkOf(order);
                  if (link) openMeet(link);
                }}
              >
                <ModeIcon className="w-4 h-4 mr-1.5" />
                {meetLinkOf(order) ? "Join on Google Meet" : "Waiting for the doctor to start"}
              </Button>
              <p className="mt-2 text-center text-[11px] text-muted-foreground">
                The consultation happens in the Google Meet app.{" "}
                <button type="button" className="font-semibold text-primary underline-offset-2 hover:underline" onClick={() => openMeet(meetInstallUrl())}>
                  Don't have it? Install
                </button>
              </p>
            </>
          )}
          {status === "completed" && order.report_url && (
            <Button className="mt-3 w-full h-11 rounded-xl" onClick={() => window.open(order.report_url!, "_blank")}>
              <Eye className="w-4 h-4 mr-1.5" /> View prescription
            </Button>
          )}
          {(status === "missed" || status === "cancelled") && (
            <Button className="mt-3 w-full h-11 rounded-xl" onClick={() => navigate("/doctor-consult", { state: { reset: true } })}>
              Book again
            </Button>
          )}
        </section>

        {status === "completed" && (
          <section className="rounded-2xl border border-border/60 bg-card shadow-sm p-4">
            {order.consult_rating ? (
              <>
                <p className="text-sm font-bold text-foreground">Your rating</p>
                <div className="mt-2 flex items-center gap-1" aria-label={`You rated ${order.consult_rating} out of 5`}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star key={n} className={`w-6 h-6 ${n <= order.consult_rating! ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                  ))}
                </div>
                {order.consult_review && <p className="mt-2 text-sm text-muted-foreground leading-snug">{order.consult_review}</p>}
              </>
            ) : (
              <>
                <p className="text-sm font-bold text-foreground">How was your consultation?</p>
                <p className="text-xs text-muted-foreground mt-0.5">Your rating helps other patients choose a doctor.</p>
                <div className="mt-3 flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" aria-label={`${n} star${n > 1 ? "s" : ""}`} aria-pressed={stars === n} onClick={() => setStars(n)} className="p-1 active:scale-90 transition-transform">
                      <Star className={`w-8 h-8 ${n <= stars ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`} />
                    </button>
                  ))}
                </div>
                {stars > 0 && (
                  <>
                    <Textarea
                      value={review}
                      onChange={(e) => setReview(e.target.value.slice(0, 500))}
                      placeholder="Anything to add? (optional)"
                      className="mt-3 rounded-2xl min-h-[72px] text-sm"
                    />
                    <Button className="mt-3 w-full h-11 rounded-xl" disabled={rating} onClick={submitRating}>
                      {rating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit rating"}
                    </Button>
                  </>
                )}
              </>
            )}
          </section>
        )}

        <section className="rounded-2xl border border-border/60 bg-card shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><User className="w-3.5 h-3.5" /> Patient</p>
            <p className="text-sm font-bold text-foreground">{patient}</p>
          </div>
          {notes && (
            <div>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><FileText className="w-3.5 h-3.5" /> Reason for visit</p>
              <p className="mt-1 text-sm text-foreground leading-snug">{notes}</p>
            </div>
          )}
          <div className="flex items-center justify-between border-t border-border/60 pt-3">
            <p className="text-xs text-muted-foreground">Fee</p>
            <p className="text-base font-black text-foreground tabular-nums">₹{order.total}</p>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Booking {order.order_number || `#${order.id.slice(0, 8)}`} · booked {format(new Date(order.created_at), "dd MMM yyyy")}
          </p>
        </section>

        {(status === "upcoming" || status === "missed") && (
          <Button
            variant="outline"
            className="w-full h-11 rounded-xl border-destructive/30 text-destructive hover:bg-destructive/5 hover:text-destructive"
            onClick={() => setConfirmCancel(true)}
          >
            Cancel appointment
          </Button>
        )}
      </div>

      <AlertDialog open={confirmCancel} onOpenChange={(open) => !cancelling && setConfirmCancel(open)}>
        <AlertDialogContent className="max-w-[90%] rounded-3xl border border-border bg-card shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold">Cancel this appointment?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs leading-relaxed">
              Your {modeLabel.toLowerCase()} with <span className="font-bold text-foreground">{info.doctorName}</span> will be cancelled and the doctor will be told. You can book again any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-3">
            <AlertDialogCancel className="flex-1 mt-0 rounded-2xl h-11 text-xs font-bold" disabled={cancelling}>Keep it</AlertDialogCancel>
            <AlertDialogAction
              className="flex-1 rounded-2xl h-11 text-xs font-bold bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              disabled={cancelling}
              onClick={(e) => {
                e.preventDefault();
                void cancelAppointment();
              }}
            >
              {cancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : "Cancel appointment"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MobileLayout>
  );
};

export default AppointmentDetailScreen;
