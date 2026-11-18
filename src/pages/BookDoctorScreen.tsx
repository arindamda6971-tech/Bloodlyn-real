import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, Heart, Loader2, Plus, ShieldCheck, User, Wallet, Zap } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import MobileLayout from "@/components/layout/MobileLayout";
import ScreenHeader from "@/components/layout/ScreenHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import AddFamilyMemberDialog from "@/components/AddFamilyMemberDialog";
import { DoctorAvatar } from "@/components/doctors/DoctorAvatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useFamilyMembers, type FamilyMember } from "@/hooks/useFamilyMembers";
import { useSelfPatient, type PatientDetails } from "@/hooks/useSelfPatient";
import type { Doctor } from "@/types/consultation";
import { doctorCartId } from "@/lib/doctor-directory";
import { bookingDays, bookingReason, bookingWhen } from "@/lib/doctor-booking";
import { doctorName, problemsFor, specialtyByKey, specialtyOf, type ConsultType } from "@/lib/doctor-finder";
import { sanitizeBloodPressure, sanitizeBloodSugar } from "@/utils/inputSanitizers";
import { MODES, feeOf } from "@/components/doctors/consultModes";

export interface BookDoctorState {
  doctor: Doctor;
  type: ConsultType;
  /** The specialty the patient chose on the doctor list: its common problems are offered. */
  specialty?: string | null;
  /** Book for this person instead of asking (kept for links that already know). */
  patient?: PatientDetails;
}

const CALL_NAME = { video: "Video Call", audio: "Audio Call" } as const;

/**
 * Booking a doctor on one page: who it's for, which day, and briefly what's wrong (the
 * rest is said on the call). Doctors book by day, not time: today (the doctor calls as
 * soon as they can) or one of the next two days. Paid after the consultation.
 */
const BookDoctorScreen = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const state = useLocation().state as BookDoctorState | null;
  const self = useSelfPatient();
  const { members, addMember } = useFamilyMembers();

  // A consultation is always for today: the doctor calls back as soon as they can.
  const date = useMemo(() => bookingDays()[0].date, []);
  const [type, setType] = useState<BookDoctorState["type"]>(state?.type ?? "video");
  const [who, setWho] = useState<string>("self");
  const [addingMember, setAddingMember] = useState(false);
  const [problems, setProblems] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [showHealth, setShowHealth] = useState(false);
  const [health, setHealth] = useState({ bp: "", sugar: "", medicines: "" });
  const [placing, setPlacing] = useState(false);
  // One key per visit to this screen: a double tap or a retry is the same booking, while
  // booking again (another family member, or after cancelling) is a new one. The server
  // refuses a second open booking for the same person, doctor and day.
  const attemptKey = useRef(crypto.randomUUID());

  useEffect(() => {
    if (!state?.doctor) navigate("/doctor-consult", { replace: true });
  }, [state, navigate]);

  if (!state?.doctor) return null;
  const { doctor } = state;
  const offered = (["video", "audio"] as const).filter((t) => feeOf(doctor, t) > 0);
  const fee = feeOf(doctor, type);
  const specialty = specialtyByKey(state.specialty) ?? specialtyOf(doctor);
  const suggestions = problemsFor(state.specialty, doctor);
  const isToday = true;
  const dayText = "today";

  const selfPatient: PatientDetails = state.patient ?? self ?? { name: "Me", age: "", gender: "", phone: "" };
  const member = who === "self" ? null : members.find((m) => m.id === who) ?? null;
  const patient: PatientDetails = member
    ? { name: member.fullName, age: member.age, gender: member.gender, phone: member.phone }
    : selfPatient;

  const whatHappens = `${doctorName(doctor.name)} will call you shortly. When they're online, your phone rings in BloodLyn and you join on Google Meet.`;

  const toggleProblem = (label: string) =>
    setProblems((list) => (list.includes(label) ? list.filter((p) => p !== label) : list.length < 5 ? [...list, label] : list));

  const addFamilyMember = async (data: Omit<FamilyMember, "id">) => {
    const added = await addMember(data);
    if (added) {
      setWho(added.id);
      toast.success(`Added ${added.fullName}`);
    }
  };

  const confirm = async () => {
    if (!user || placing) return;
    setPlacing(true);
    try {
      const phone = patient.phone.replace(/\D/g, "").slice(-10);
      const age = parseInt(patient.age, 10);
      const labName = doctor.hospitalName || "BloodLyn Medical Care";
      const reason = bookingReason(problems, note, health);
      const item = {
        id: doctorCartId(type, String(doctor.id)),
        name: `${CALL_NAME[type]} with ${doctor.name} (${patient.name})`,
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
          reason: reason || undefined,
        },
        headers: { "Idempotency-Key": `doc-${attemptKey.current}-${date}-${type}` },
      });

      let body = (data ?? {}) as { orderId?: string; error?: string; code?: string };
      // functions.invoke hides the body of a refused request in error.context.
      const ctx = (error as { context?: Response } | null)?.context;
      if (error && ctx && typeof ctx.json === "function") {
        body = (await ctx.json().catch(() => null)) ?? body;
      }
      if (body.code === "already_booked" && body.orderId) {
        toast.info(`${patient.name} already has this booking with ${doctorName(doctor.name)} for ${dayText}.`);
        navigate(`/appointment/${body.orderId}`, { replace: true });
        return;
      }
      if (error || !body.orderId) {
        toast.error(body.error || "Couldn't book. Please try again.");
        return;
      }

      queryClient.invalidateQueries({ queryKey: ["orders"] });
      navigate(`/appointment/${body.orderId}?booked=1`, { replace: true });
    } catch (e) {
      console.error("Doctor booking failed", e);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setPlacing(false);
    }
  };

  const chip = (active: boolean) =>
    `shrink-0 rounded-full border px-3.5 py-2 text-[13px] font-semibold transition-colors ${
      active ? "border-primary bg-primary text-primary-foreground" : "border-border/70 bg-card text-foreground"
    }`;

  return (
    <MobileLayout showNav={false}>
      <ScreenHeader title="Book consultation" />

      <div className="space-y-6 px-4 pb-[calc(var(--sab)+128px)] pt-4">
        {/* Doctor and mode */}
        <section className="rounded-3xl border border-border/60 bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <DoctorAvatar name={doctor.name} image={doctor.image} id={doctor.id} className="h-12 w-12 rounded-2xl text-sm" />
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-base font-extrabold leading-tight text-foreground">{doctorName(doctor.name)}</h2>
              <p className="truncate text-xs text-muted-foreground">
                {doctor.specialty}
                {doctor.experience > 0 ? ` · ${doctor.experience} yrs exp` : ""}
              </p>
            </div>
          </div>
          {offered.length > 1 && (
            <div className="mt-3.5 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Consultation type">
              {offered.map((t) => {
                const info = MODES[t];
                const active = t === type;
                return (
                  <button
                    key={t}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setType(t)}
                    className={`rounded-2xl border px-2 py-2.5 text-center transition-colors ${active ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border/70"}`}
                  >
                    <info.icon className={`mx-auto h-4 w-4 ${active ? "text-primary" : "text-muted-foreground"}`} />
                    <p className="mt-1 text-xs font-bold text-foreground">{info.short}</p>
                    <p className="text-[11px] font-semibold tabular-nums text-muted-foreground">₹{feeOf(doctor, t)}</p>
                  </button>
                );
              })}
            </div>
          )}
          {offered.length <= 1 && (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary">
              {(() => {
                const Icon = MODES[type].icon;
                return <Icon className="h-3.5 w-3.5" />;
              })()}
              {MODES[type].label} · ₹{fee}
            </p>
          )}
        </section>

        {/* Patient */}
        <section>
          <div className="mb-2.5 flex items-center justify-between">
            <h3 className="text-sm font-black text-foreground">Who is it for?</h3>
            <button type="button" onClick={() => setAddingMember(true)} className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
              <Plus className="h-3.5 w-3.5" /> Add member
            </button>
          </div>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none">
            <button type="button" aria-pressed={who === "self"} onClick={() => setWho("self")} className={`${chip(who === "self")} flex items-center gap-1.5`}>
              <User className="h-3.5 w-3.5" /> Me{selfPatient.name && selfPatient.name !== "Me" ? ` (${selfPatient.name})` : ""}
            </button>
            {members.map((m) => (
              <button key={m.id} type="button" aria-pressed={who === m.id} onClick={() => setWho(m.id)} className={`${chip(who === m.id)} flex items-center gap-1.5`}>
                <Heart className="h-3.5 w-3.5" /> {m.fullName}
                <span className={who === m.id ? "text-primary-foreground/75" : "text-muted-foreground"}>
                  {m.relationship === "Other" ? m.customRelationship || "Relative" : m.relationship === "Self" ? "" : m.relationship}
                </span>
              </button>
            ))}
          </div>
          {(patient.age || patient.gender) && (
            <p className="mt-2 text-xs text-muted-foreground">
              {[patient.age && `${patient.age} yrs`, patient.gender].filter(Boolean).join(" · ")}
            </p>
          )}
        </section>

        {/* No day or time to pick: the doctor calls as soon as they can. */}
        <p className="flex items-start gap-2 rounded-2xl border border-sky-500/20 bg-sky-500/5 px-3 py-2.5 text-xs leading-snug text-foreground">
          <Zap className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" /> {whatHappens}
        </p>

        {/* Problem */}
        <section>
          <h3 className="text-sm font-black text-foreground">What's the problem? <span className="font-semibold text-muted-foreground">(optional)</span></h3>
          <p className="mb-2.5 text-xs text-muted-foreground">
            {specialty ? `Common reasons to see a ${specialty.label.toLowerCase()}. ` : ""}Pick any that fit; you can tell the doctor the rest on the call.
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((label) => (
              <button key={label} type="button" aria-pressed={problems.includes(label)} onClick={() => toggleProblem(label)} className={chip(problems.includes(label))}>
                {label}
              </button>
            ))}
          </div>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 300))}
            placeholder="Anything else? E.g. since 3 days"
            aria-label="Describe the problem"
            className="mt-3 min-h-[84px] rounded-2xl text-sm"
          />
        </section>

        {/* Health details */}
        <section className="rounded-3xl border border-border/60 bg-card">
          <button type="button" onClick={() => setShowHealth((v) => !v)} aria-expanded={showHealth} className="flex w-full items-center justify-between px-4 py-3.5 text-left">
            <span>
              <span className="block text-sm font-bold text-foreground">Health details <span className="font-semibold text-muted-foreground">(optional)</span></span>
              <span className="block text-xs text-muted-foreground">BP, sugar and medicines you take</span>
            </span>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showHealth ? "rotate-180" : ""}`} />
          </button>
          {showHealth && (
            <div className="space-y-3 border-t border-border/50 px-4 pb-4 pt-3">
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1">
                  <span className="text-xs font-semibold text-muted-foreground">Blood pressure</span>
                  <input value={health.bp} onChange={(e) => setHealth((h) => ({ ...h, bp: sanitizeBloodPressure(e.target.value) }))} maxLength={7} placeholder="120/80" className="h-11 w-full rounded-xl border border-border/70 bg-background px-3 text-sm outline-none focus:border-primary/50" />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-semibold text-muted-foreground">Sugar (mg/dL)</span>
                  <input value={health.sugar} onChange={(e) => setHealth((h) => ({ ...h, sugar: sanitizeBloodSugar(e.target.value) }))} inputMode="numeric" maxLength={3} placeholder="100" className="h-11 w-full rounded-xl border border-border/70 bg-background px-3 text-sm outline-none focus:border-primary/50" />
                </label>
              </div>
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-muted-foreground">Medicines you take</span>
                <input value={health.medicines} onChange={(e) => setHealth((h) => ({ ...h, medicines: e.target.value.slice(0, 120) }))} placeholder="E.g. Metformin 500" className="h-11 w-full rounded-xl border border-border/70 bg-background px-3 text-sm outline-none focus:border-primary/50" />
              </label>
            </div>
          )}
        </section>

        {/* Bill */}
        <section className="rounded-3xl border border-border/60 bg-card p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Consultation fee</span>
            <span className="font-bold tabular-nums text-foreground">₹{fee}</span>
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-dashed border-border pt-2 text-sm">
            <span className="font-bold text-foreground">Pay now</span>
            <span className="font-black tabular-nums text-emerald-600">₹0</span>
          </div>
          <p className="mt-2.5 flex items-start gap-2 rounded-2xl bg-emerald-500/10 px-3 py-2 text-xs font-semibold leading-snug text-emerald-800 dark:text-emerald-300">
            <Wallet className="mt-0.5 h-4 w-4 shrink-0" />
            You pay only after the doctor has seen you.
          </p>
        </section>

        <p className="flex items-start gap-1.5 px-1 text-[11px] text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
          You can cancel any time before the consultation. Your booking is under My Orders → Appointments.
        </p>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full border-t border-border/60 bg-background/95 px-4 pb-[calc(var(--sab)+12px)] pt-3 backdrop-blur md:max-w-[430px]">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-semibold capitalize text-muted-foreground">
              {patient.name} · {dayText}
            </p>
            <p className="text-lg font-black tabular-nums text-foreground">₹{fee}</p>
          </div>
          <Button className="h-12 rounded-2xl px-6 text-[15px] font-bold" disabled={placing} onClick={confirm}>
            {placing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm booking"}
          </Button>
        </div>
      </div>

      <AddFamilyMemberDialog open={addingMember} onOpenChange={setAddingMember} onAdd={addFamilyMember} existingMembers={members} />
    </MobileLayout>
  );
};

export default BookDoctorScreen;
