import { useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  BellRing,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  Loader2,
  Phone,
  Star,
  User,
  Video,
  Wallet,
} from "lucide-react";
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
import { DoctorAvatar } from "@/components/doctors/DoctorAvatar";
import { supabase } from "@/integrations/supabase/client";
import { useOrderDetails } from "@/hooks/useOrderDetails";
import { useRealtimeOrders } from "@/hooks/useRealtimeOrders";
import { useSEO } from "@/hooks/useSEO";
import { consultInfo, consultProgress, consultStatus, type ConsultStep } from "@/lib/doctor-orders";
import { doctorName } from "@/lib/doctor-finder";
import { callEnded, meetInstallUrl, meetLinkOf, openMeet } from "@/lib/meet";
import { prescriptionOf } from "@/lib/prescription";

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

/** Booked → doctor calls → consultation → prescription, with where this one is. */
function Tracker({ steps }: { steps: ConsultStep[] }) {
  return (
    <ol className="flex items-start" aria-label="Consultation progress">
      {steps.map((s, i) => (
        <li key={s.key} className="relative flex flex-1 flex-col items-center text-center" aria-current={s.state === "current" ? "step" : undefined}>
          {i > 0 && (
            <span className={`absolute right-1/2 top-3.5 h-0.5 w-full ${s.state === "todo" ? "bg-border" : "bg-emerald-500"}`} aria-hidden />
          )}
          <span
            className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 text-[11px] font-black ${
              s.state === "done"
                ? "border-emerald-500 bg-emerald-500 text-white"
                : s.state === "current"
                  ? "border-primary bg-background text-primary ring-4 ring-primary/15"
                  : "border-border bg-background text-muted-foreground"
            }`}
          >
            {s.state === "done" ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}
          </span>
          <span className={`mt-1.5 px-0.5 text-[10px] font-bold leading-tight ${s.state === "todo" ? "text-muted-foreground" : "text-foreground"}`}>{s.label}</span>
        </li>
      ))}
    </ol>
  );
}

/** A doctor consultation: where it stands, how to join, and the prescription afterwards. */
const AppointmentDetailScreen = () => {
  useSEO({ title: "Appointment | BloodLyn", description: "Your doctor consultation." });
  const { id } = useParams();
  const [params] = useSearchParams();
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
        <div className="mt-3 space-y-3 px-4">
          <Skeleton className="h-56 rounded-3xl" />
          <Skeleton className="h-28 rounded-3xl" />
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
  // Seen by the doctor, prescription still to come: no longer "Upcoming".
  const statusInfo =
    status === "upcoming" && callEnded(order)
      ? { label: "Consulted", tone: "bg-success/15 text-success" }
      : STATUS[status];
  const online = info.mode !== "clinic";
  const ModeIcon = info.mode === "video" ? Video : info.mode === "audio" ? Phone : Building2;
  const modeLabel = info.mode === "video" ? "Video consultation" : info.mode === "audio" ? "Audio consultation" : "Clinic visit";
  const patient = info.patientName || order.patient_name || order.family_members?.full_name || "Self";
  const notes = (order.special_instructions || "").match(/Reason:\s*([^|]+)/)?.[1]?.trim() ?? "";
  const cancelledBy = /doctor/i.test(order.cancellation_reason || "") ? "the doctor" : /patient/i.test(order.cancellation_reason || "") ? "you" : null;
  // "Cancelled by the doctor: I'm not available today" → the doctor's own words.
  const doctorReason = ((order.cancellation_reason || "").match(/^Cancelled by the doctor:\s*(.+)$/i)?.[1] ?? "").replace(/[.\s]+$/, "");
  const link = meetLinkOf(order);
  const ended = callEnded(order);
  const rx = prescriptionOf(order);
  const steps = consultProgress(order, info.mode);
  const justBooked = params.get("booked") === "1" && status === "upcoming" && !link && !ended;
  const day = order.scheduled_date ? new Date(order.scheduled_date) : null;
  const isToday = day ? format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd") : false;
  const dayText = day ? (isToday ? "today" : format(day, "EEE, d MMM")) : "on your day";
  const doctor = doctorName(info.doctorName);

  const headline =
    status === "cancelled"
      ? cancelledBy
        ? `This appointment was cancelled by ${cancelledBy}.${doctorReason ? ` Reason: ${doctorReason}.` : ""} Nothing is charged.`
        : "This appointment was cancelled."
      : status === "missed"
        ? online
          ? "The doctor didn't call on the booked day. Nothing is charged; you can book again."
          : "The day of this visit has passed. If you didn't see the doctor, you can book again."
        : status === "completed"
          ? rx || order.report_url
            ? "Consultation completed. Your prescription is below."
            : "Consultation completed."
          : !online
            ? `Visit the clinic ${dayText} during clinic hours. Please reach a few minutes early.`
            : ended
              ? "The doctor has ended the consultation. Your prescription will appear here as soon as they send it."
              : link
                ? `${doctor} is waiting for you on Google Meet.`
                : `${doctor} will call you shortly. When they're online, your phone rings in BloodLyn and you join on Google Meet.`;

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
      <ScreenHeader title="Appointment" onBack={justBooked ? () => navigate("/bookings", { replace: true }) : undefined} />

      <div className="space-y-3 px-4 pb-10 pt-3">
        {justBooked && (
          <section className="flex items-start gap-3 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 p-4 text-white shadow-lg shadow-emerald-600/20">
            <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0" />
            <div className="min-w-0">
              <p className="text-base font-black leading-tight">Booking confirmed</p>
              <p className="mt-0.5 text-[13px] leading-snug text-white/90">
                {online
                  ? `${doctor} will call ${patient === "Self" ? "you" : patient} shortly. Nothing to pay now.`
                  : `See ${doctor} ${dayText}. Pay the fee at the clinic.`}
              </p>
            </div>
          </section>
        )}

        <section className="rounded-3xl border border-border/60 bg-card p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <DoctorAvatar name={info.doctorName} id={order.vendor_id || info.doctorName} className="h-14 w-14 rounded-2xl text-base" />
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-lg font-extrabold leading-tight text-foreground">{doctor}</h2>
              <p className="mt-0.5 flex items-center gap-1 text-xs font-bold text-primary">
                <ModeIcon className="h-3.5 w-3.5" /> {modeLabel}
              </p>
              {!online && order.lab_name && <p className="truncate text-xs text-muted-foreground">{order.lab_name}</p>}
            </div>
            <span className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold ${statusInfo.tone}`}>
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {statusInfo.label}
            </span>
          </div>

          {steps && (
            <div className="mt-4 rounded-2xl bg-muted/40 px-1 py-3">
              <Tracker steps={steps} />
            </div>
          )}

          <p className="mt-3.5 text-sm leading-snug text-foreground/80">{headline}</p>

          {status === "upcoming" && online && !ended && (
            <div className="mt-3.5">
              {link ? (
                <Button className="h-12 w-full rounded-2xl bg-emerald-600 text-[15px] font-bold text-white shadow-lg shadow-emerald-600/25 hover:bg-emerald-700" onClick={() => openMeet(link)}>
                  <span className="relative mr-2 flex h-2.5 w-2.5" aria-hidden>
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/80" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
                  </span>
                  <ModeIcon className="mr-1.5 h-5 w-5" /> Join on Google Meet
                </Button>
              ) : (
                <div className="flex items-center gap-3 rounded-2xl border border-sky-500/20 bg-sky-500/5 px-3.5 py-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-500/15 text-sky-600">
                    <BellRing className="h-4 w-4" />
                  </span>
                  <p className="text-xs leading-snug text-foreground">
                    <span className="font-bold">Keep BloodLyn open and your sound on.</span> The Join button appears here when the doctor starts.
                  </p>
                </div>
              )}
              <p className="mt-2 text-center text-[11px] text-muted-foreground">
                The consultation happens in the Google Meet app.{" "}
                <button type="button" className="font-semibold text-primary underline-offset-2 hover:underline" onClick={() => openMeet(meetInstallUrl())}>
                  Don't have it? Install
                </button>
              </p>
            </div>
          )}

          {rx ? (
            <button
              type="button"
              onClick={() => navigate(`/prescription/${order.id}`)}
              className="mt-3.5 flex w-full items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-left transition-transform active:scale-[0.99]"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                <FileText className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-foreground">Your prescription is ready</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {[
                    rx.medicines.length > 0 && `${rx.medicines.length} ${rx.medicines.length === 1 ? "medicine" : "medicines"}`,
                    rx.tests.length > 0 && `${rx.tests.length} ${rx.tests.length === 1 ? "test" : "tests"} to book`,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "Tap to read your doctor's advice"}
                </span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-400" />
            </button>
          ) : status === "completed" && order.report_url ? (
            <Button className="mt-3.5 h-11 w-full rounded-2xl" onClick={() => window.open(order.report_url!, "_blank")}>
              <FileText className="mr-1.5 h-4 w-4" /> View prescription
            </Button>
          ) : null}

          {(status === "missed" || status === "cancelled") && (
            <Button className="mt-3.5 h-11 w-full rounded-2xl" onClick={() => navigate("/doctor-consult")}>
              Book again
            </Button>
          )}
        </section>

        {status === "completed" && (
          <section className="rounded-3xl border border-border/60 bg-card p-4 shadow-sm">
            {order.consult_rating ? (
              <>
                <p className="text-sm font-bold text-foreground">Your rating</p>
                <div className="mt-2 flex items-center gap-1" aria-label={`You rated ${order.consult_rating} out of 5`}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star key={n} className={`h-6 w-6 ${n <= order.consult_rating! ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                  ))}
                </div>
                {order.consult_review && <p className="mt-2 text-sm leading-snug text-muted-foreground">{order.consult_review}</p>}
              </>
            ) : (
              <>
                <p className="text-sm font-bold text-foreground">How was your consultation with {doctor}?</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Your rating helps other patients choose a doctor.</p>
                <div className="mt-3 flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" aria-label={`${n} star${n > 1 ? "s" : ""}`} aria-pressed={stars === n} onClick={() => setStars(n)} className="p-1 transition-transform active:scale-90">
                      <Star className={`h-8 w-8 ${n <= stars ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`} />
                    </button>
                  ))}
                </div>
                {stars > 0 && (
                  <>
                    <Textarea
                      value={review}
                      onChange={(e) => setReview(e.target.value.slice(0, 500))}
                      placeholder="Anything to add? (optional)"
                      className="mt-3 min-h-[72px] rounded-2xl text-sm"
                    />
                    <Button className="mt-3 h-11 w-full rounded-2xl" disabled={rating} onClick={submitRating}>
                      {rating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit rating"}
                    </Button>
                  </>
                )}
              </>
            )}
          </section>
        )}

        <section className="divide-y divide-border/60 rounded-3xl border border-border/60 bg-card px-4 shadow-sm">
          <div className="grid grid-cols-2 gap-3 py-3.5">
            <div>
              <p className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground"><Calendar className="h-3.5 w-3.5" /> Day</p>
              <p className="mt-0.5 text-sm font-bold text-foreground">{day ? format(day, "EEE, dd MMM yyyy") : "To be fixed"}</p>
            </div>
            <div>
              <p className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground"><Clock className="h-3.5 w-3.5" /> Time</p>
              <p className="mt-0.5 truncate text-sm font-bold text-foreground">{order.scheduled_time_slot || "To be fixed"}</p>
            </div>
          </div>
          <div className="flex items-center justify-between py-3.5">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><User className="h-3.5 w-3.5" /> Patient</p>
            <p className="text-sm font-bold text-foreground">{patient}</p>
          </div>
          {notes && (
            <div className="py-3.5">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><FileText className="h-3.5 w-3.5" /> What you told the doctor</p>
              <p className="mt-1 text-sm leading-snug text-foreground">{notes}</p>
            </div>
          )}
          <div className="py-3.5">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Wallet className="h-3.5 w-3.5" /> Fee</p>
              <p className="text-base font-black tabular-nums text-foreground">₹{order.total}</p>
            </div>
            {status === "upcoming" && (
              <p className="mt-1 text-[11px] text-muted-foreground">{online ? "Pay after the consultation." : "Pay at the clinic."}</p>
            )}
          </div>
          <p className="py-3 text-[11px] text-muted-foreground">
            Booking {order.order_number || `#${order.id.slice(0, 8)}`} · booked {format(new Date(order.created_at), "dd MMM yyyy")}
          </p>
        </section>

        {/* Once the doctor has seen the patient, the booking can't be cancelled. */}
        {(status === "upcoming" || status === "missed") && !link && !ended && (
          <Button
            variant="outline"
            className="h-11 w-full rounded-2xl border-destructive/30 text-destructive hover:bg-destructive/5 hover:text-destructive"
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
              Your {modeLabel.toLowerCase()} with <span className="font-bold text-foreground">{doctor}</span> will be cancelled and the doctor will be told. You can book again any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-3">
            <AlertDialogCancel className="mt-0 h-11 flex-1 rounded-2xl text-xs font-bold" disabled={cancelling}>Keep it</AlertDialogCancel>
            <AlertDialogAction
              className="h-11 flex-1 rounded-2xl bg-destructive text-xs font-bold text-destructive-foreground hover:bg-destructive/90"
              disabled={cancelling}
              onClick={(e) => {
                e.preventDefault();
                void cancelAppointment();
              }}
            >
              {cancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cancel appointment"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MobileLayout>
  );
};

export default AppointmentDetailScreen;
