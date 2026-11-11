import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Building2, Clock, Loader2, Phone, ShieldCheck, Stethoscope, User, Video, Zap } from "lucide-react";
import { toast } from "sonner";
import MobileLayout from "@/components/layout/MobileLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import type { Doctor } from "@/types/consultation";
import { doctorCartId } from "@/lib/doctor-directory";
import { bookingDays, bookingWhen } from "@/lib/doctor-booking";

export interface BookDoctorState {
  doctor: Doctor;
  type: "video" | "audio" | "physical";
  patient: { name: string; age: string; gender: string; phone: string };
  symptoms: string;
}

const MODE = {
  video: { label: "Video consultation", short: "Video Call", icon: Video },
  audio: { label: "Audio consultation", short: "Audio Call", icon: Phone },
  physical: { label: "Clinic visit", short: "Physical Appointment", icon: Building2 },
} as const;

/**
 * Quick doctor booking: today (the doctor calls as soon as they can) or one of the next
 * two days. No time slots: the doctor sees every booking for the day and stops new ones
 * by switching off "Accepting consultations".
 */
const BookDoctorScreen = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const state = useLocation().state as BookDoctorState | null;

  const days = useMemo(() => bookingDays(), []);
  const [date, setDate] = useState(days[0].date);
  const [reason, setReason] = useState(state?.symptoms ?? "");
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    if (!state?.doctor) navigate("/doctor-consult", { replace: true });
  }, [state, navigate]);

  if (!state?.doctor) return null;
  const { doctor, type, patient } = state;
  const mode = MODE[type];
  const ModeIcon = mode.icon;
  const fee = type === "video" ? doctor.videoCallFee : type === "audio" ? doctor.audioCallFee : doctor.physicalCallFee;
  const chosenDay = days.find((d) => d.date === date)!;
  const isToday = date === days[0].date;
  const dayText = isToday ? "today" : chosenDay.top === "Tomorrow" ? "tomorrow" : `${chosenDay.top}, ${chosenDay.day} ${chosenDay.month}`;

  const whatHappens =
    type === "physical"
      ? `Visit ${doctor.hospitalName || "the clinic"} ${dayText} during clinic hours. Pay at the clinic.`
      : isToday
        ? "The doctor will ring you in the BloodLyn app as soon as they can and you'll join on Google Meet. Pay after the consultation."
        : `The doctor will ring you in the BloodLyn app ${dayText} and you'll join on Google Meet. Pay after the consultation.`;

  const confirm = async () => {
    if (!user || placing) return;
    setPlacing(true);
    try {
      const phone = patient.phone.replace(/\D/g, "").slice(-10);
      const age = parseInt(patient.age, 10);
      const labName = doctor.hospitalName || "BloodLyn Medical Care";
      const item = {
        id: doctorCartId(type, String(doctor.id)),
        name: `${mode.short} with ${doctor.name} (${patient.name})`,
        price: fee,
        quantity: 1,
        // Not a lab: create-order only accepts real lab ids here.
        labId: null,
        labName,
        vendorId: String(doctor.id),
      };
      const { data, error } = await supabase.functions.invoke("create-order", {
        body: {
          cartItems: [item],
          addressId: null,
          scheduledDate: date,
          scheduledTimeSlot: bookingWhen(isToday),
          subtotal: fee,
          discount: 0,
          total: fee,
          paymentMethod: "cod",
          patientName: patient.name,
          patientAge: Number.isFinite(age) && age >= 0 && age <= 120 ? age : null,
          patientGender: patient.gender || null,
          patientPhone: /^\d{10}$/.test(phone) ? phone : null,
          labId: null,
          labName,
          vendorId: String(doctor.id),
          reason: reason.trim() || undefined,
        },
        headers: { "Idempotency-Key": `doc-${user.id}-${doctor.id}-${date}-${type}` },
      });

      const body = (data ?? {}) as { orderId?: string; error?: string };
      if (error || !body.orderId) {
        let message = body.error;
        // functions.invoke hides the body of a refused request in error.context.
        const ctx = (error as { context?: Response } | null)?.context;
        if (!message && ctx && typeof ctx.json === "function") {
          message = (await ctx.json().catch(() => null))?.error;
        }
        toast.error(message || "Couldn't book. Please try again.");
        return;
      }

      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success(`Booked ${doctor.name} for ${dayText}`);
      navigate(`/appointment/${body.orderId}`, { replace: true });
    } catch (e) {
      console.error("Doctor booking failed", e);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setPlacing(false);
    }
  };

  return (
    <MobileLayout showNav={false}>
      <div className="sticky top-0 z-40 bg-background/98 border-b border-border/40">
        <div className="flex items-center gap-3 px-4 pt-4 pb-3">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center active:scale-95 transition-transform"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-[17px] font-black text-foreground tracking-tight">Book appointment</h1>
        </div>
      </div>

      <div className="px-4 pt-4 pb-[calc(var(--sab)+120px)] space-y-5">
        {/* Doctor */}
        <section className="rounded-3xl border border-border/60 bg-card p-4 shadow-sm">
          <div className="flex items-start gap-3">
            {doctor.image ? (
              <img src={doctor.image} alt="" className="w-14 h-14 rounded-2xl object-cover shrink-0" />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                <Stethoscope className="w-7 h-7" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h2 className="font-extrabold text-foreground text-base leading-tight truncate">{doctor.name}</h2>
              <p className="text-xs text-muted-foreground truncate">
                {doctor.specialty}
                {doctor.experience > 0 ? ` · ${doctor.experience} yrs exp` : ""}
              </p>
              <p className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                <ModeIcon className="w-3 h-3" /> {mode.label}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[10px] font-semibold text-muted-foreground">Fee</p>
              <p className="text-lg font-black text-foreground tabular-nums">₹{fee}</p>
            </div>
          </div>
          {type === "physical" && doctor.clinicAddress && (
            <p className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
              <Building2 className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>{[doctor.hospitalName, doctor.clinicAddress].filter(Boolean).join(", ")}</span>
            </p>
          )}
          <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <User className="w-3.5 h-3.5" /> For <span className="font-bold text-foreground">{patient.name}</span>
          </p>
        </section>

        {/* Day */}
        <section>
          <h3 className="text-sm font-black text-foreground mb-2">When?</h3>
          <div className="grid grid-cols-3 gap-2">
            {days.map((d, i) => {
              const active = d.date === date;
              return (
                <button
                  key={d.date}
                  onClick={() => setDate(d.date)}
                  className={`rounded-2xl border px-2 py-3 text-center transition-colors ${
                    active ? "bg-primary text-primary-foreground border-primary shadow-md" : "bg-card border-border/60 text-foreground"
                  }`}
                >
                  <p className="text-sm font-black leading-tight">{d.top}</p>
                  <p className={`text-[11px] font-semibold mt-0.5 ${active ? "text-primary-foreground/90" : "text-muted-foreground"}`}>
                    {d.day} {d.month}
                  </p>
                  {i === 0 && type !== "physical" && (
                    <p className={`mt-1 inline-flex items-center gap-0.5 text-[10px] font-bold ${active ? "text-primary-foreground" : "text-emerald-600"}`}>
                      <Zap className="w-3 h-3" /> Quick
                    </p>
                  )}
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex items-start gap-2 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 px-3 py-2.5">
            <Clock className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
            <p className="text-xs text-foreground leading-snug">{whatHappens}</p>
          </div>
        </section>

        {/* Reason */}
        <section>
          <h3 className="text-sm font-black text-foreground mb-2">Reason for visit <span className="font-semibold text-muted-foreground">(optional)</span></h3>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value.slice(0, 500))}
            placeholder="E.g. fever for 3 days, headache"
            className="rounded-2xl min-h-[84px] text-sm"
          />
        </section>

        <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
          <ShieldCheck className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-600" />
          You'll find this booking under My Orders → Appointments.
        </p>
      </div>

      {/* Confirm */}
      <div className="fixed bottom-0 left-0 right-0 w-full md:max-w-[430px] mx-auto z-40 border-t border-border/60 bg-background/98 px-4 pt-3 pb-[calc(var(--sab)+12px)]">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] text-muted-foreground truncate capitalize">{dayText}</p>
            <p className="text-lg font-black text-foreground tabular-nums">₹{fee}</p>
          </div>
          <Button
            className="h-12 rounded-2xl px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            disabled={placing}
            onClick={confirm}
          >
            {placing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm booking"}
          </Button>
        </div>
      </div>
    </MobileLayout>
  );
};

export default BookDoctorScreen;
