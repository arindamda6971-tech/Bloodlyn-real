import { useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { BadgeCheck, Building2, Check, FileText, MapPin, Phone, ShieldCheck, Star, Video, Wallet } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import ScreenHeader from "@/components/layout/ScreenHeader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DoctorAvatar } from "@/components/doctors/DoctorAvatar";
import { useDoctor } from "@/hooks/useDoctors";
import { useSEO } from "@/hooks/useSEO";
import { doctorName, problemByKey, specialtyOf } from "@/lib/doctor-finder";
import { MODES } from "@/components/doctors/consultModes";
import type { BookDoctorState } from "@/pages/BookDoctorScreen";

type Mode = BookDoctorState["type"];

const STEPS: Record<"online" | "clinic", Array<{ icon: typeof Video; title: string; text: string }>> = {
  online: [
    { icon: Check, title: "Book today or a later day", text: "Tell the doctor what's wrong. No payment now." },
    { icon: Phone, title: "Your phone rings", text: "When the doctor starts, BloodLyn rings and you join on Google Meet." },
    { icon: FileText, title: "Prescription in the app", text: "Medicines and tests arrive here. Add the tests to your cart in one tap." },
    { icon: Wallet, title: "Pay after the consultation", text: "You pay only once you've spoken to the doctor." },
  ],
  clinic: [
    { icon: Check, title: "Book your day", text: "Today or one of the next two days." },
    { icon: Building2, title: "Visit the clinic", text: "Go during clinic hours and show your booking." },
    { icon: Wallet, title: "Pay at the clinic", text: "The fee shown here is the clinic's fee." },
  ],
};

/** A doctor's page: who they are, how they consult and for how much, then booking. */
const DoctorProfileScreen = () => {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { doctor, isLoading, isError } = useDoctor(id);
  useSEO({ title: doctor ? `${doctorName(doctor.name)} | BloodLyn` : "Doctor | BloodLyn", description: "Book a consultation with a verified doctor." });

  const offered = doctor
    ? (["video", "audio", "physical"] as Mode[]).filter((m) => (m === "video" ? doctor.videoCallFee : m === "audio" ? doctor.audioCallFee : doctor.physicalCallFee) > 0)
    : [];
  const wanted: Mode | undefined = params.get("mode") === "clinic" ? "physical" : offered.find((m) => m !== "physical");
  const [picked, setPicked] = useState<Mode | null>(null);
  const mode = picked && offered.includes(picked) ? picked : wanted && offered.includes(wanted) ? wanted : offered[0];

  if (isLoading) {
    return (
      <MobileLayout showNav={false}>
        <ScreenHeader title="Doctor" />
        <div className="space-y-3 px-4 pt-4">
          <Skeleton className="h-44 rounded-3xl" />
          <Skeleton className="h-32 rounded-3xl" />
        </div>
      </MobileLayout>
    );
  }

  if (isError || !doctor || !mode) {
    return (
      <MobileLayout showNav={false}>
        <ScreenHeader title="Doctor" />
        <div className="px-6 py-20 text-center">
          <p className="font-bold text-foreground">This doctor isn't taking bookings right now</p>
          <p className="mt-1 text-sm text-muted-foreground">They may have paused consultations for today. Other doctors can see you.</p>
          <Button className="mt-4 rounded-2xl" onClick={() => navigate("/doctor-consult", { replace: true })}>See doctors</Button>
        </div>
      </MobileLayout>
    );
  }

  const fee = mode === "video" ? doctor.videoCallFee : mode === "audio" ? doctor.audioCallFee : doctor.physicalCallFee;
  const specialty = doctor.specialty || specialtyOf(doctor)?.label || "Doctor";
  const clinic = [doctor.hospitalName && doctor.hospitalName !== doctor.name ? doctor.hospitalName : "", doctor.clinicAddress, doctor.city].filter(Boolean);
  const steps = STEPS[mode === "physical" ? "clinic" : "online"];

  const book = () => {
    const state: BookDoctorState = { doctor, type: mode, symptoms: problemByKey(params.get("problem"))?.label ?? "" };
    navigate("/book-doctor", { state });
  };

  return (
    <MobileLayout showNav={false}>
      <ScreenHeader title="Doctor" />

      <div className="space-y-4 px-4 pb-[calc(var(--sab)+120px)] pt-4">
        <section className="rounded-3xl border border-border/60 bg-card p-5 text-center shadow-sm">
          <DoctorAvatar name={doctor.name} image={doctor.image} id={doctor.id} className="mx-auto h-24 w-24 rounded-[1.75rem] text-2xl" />
          <h2 className="mt-3 flex items-center justify-center gap-1.5 text-xl font-black tracking-tight text-foreground">
            {doctorName(doctor.name)} <BadgeCheck className="h-5 w-5 text-sky-600" aria-label="Verified by BloodLyn" />
          </h2>
          <p className="mt-0.5 text-sm font-bold text-primary">{specialty}</p>
          {doctor.qualification && <p className="text-xs text-muted-foreground">{doctor.qualification}</p>}

          <div className="mt-4 grid grid-cols-3 divide-x divide-border/60 rounded-2xl bg-muted/40 py-3">
            <div>
              <p className="text-base font-black text-foreground">{doctor.experience > 0 ? `${doctor.experience} yrs` : "—"}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Experience</p>
            </div>
            <div>
              <p className="flex items-center justify-center gap-1 text-base font-black text-foreground">
                {doctor.reviews > 0 ? (
                  <>
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" /> {doctor.rating.toFixed(1)}
                  </>
                ) : (
                  "New"
                )}
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {doctor.reviews > 0 ? `${doctor.reviews} ratings` : "No ratings yet"}
              </p>
            </div>
            <div>
              <p className="text-base font-black text-foreground">₹{Math.min(...offered.map((m) => (m === "video" ? doctor.videoCallFee : m === "audio" ? doctor.audioCallFee : doctor.physicalCallFee)))}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Fee from</p>
            </div>
          </div>
        </section>

        <section>
          <h3 className="mb-2.5 text-sm font-black text-foreground">How do you want to consult?</h3>
          <div className="space-y-2">
            {offered.map((m) => {
              const info = MODES[m];
              const active = m === mode;
              const price = m === "video" ? doctor.videoCallFee : m === "audio" ? doctor.audioCallFee : doctor.physicalCallFee;
              return (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setPicked(m)}
                  className={`flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition-colors ${
                    active ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border/70 bg-card"
                  }`}
                >
                  <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${active ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                    <info.icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-foreground">{info.label}</span>
                    <span className="block text-xs text-muted-foreground">{info.note}</span>
                  </span>
                  <span className="text-base font-black tabular-nums text-foreground">₹{price}</span>
                </button>
              );
            })}
          </div>
        </section>

        {mode === "physical" && clinic.length > 0 && (
          <section className="rounded-3xl border border-border/60 bg-card p-4">
            <h3 className="flex items-center gap-1.5 text-sm font-black text-foreground">
              <MapPin className="h-4 w-4 text-primary" /> Clinic
            </h3>
            <p className="mt-1.5 text-sm leading-snug text-muted-foreground">{clinic.join(", ")}</p>
          </section>
        )}

        <section className="rounded-3xl border border-border/60 bg-card p-4">
          <h3 className="text-sm font-black text-foreground">What happens next</h3>
          <ol className="mt-3 space-y-3.5">
            {steps.map((s, i) => (
              <li key={s.title} className="flex gap-3">
                <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <s.icon className="h-4 w-4" />
                  {i < steps.length - 1 && <span className="absolute left-1/2 top-8 h-3.5 w-px -translate-x-1/2 bg-border" />}
                </span>
                <div className="min-w-0 pt-0.5">
                  <p className="text-sm font-bold text-foreground">{s.title}</p>
                  <p className="text-xs leading-snug text-muted-foreground">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <p className="flex items-start gap-2 px-1 text-[11px] leading-relaxed text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
          Registered with a medical council and checked by BloodLyn. You can cancel a booking any time before the consultation.
        </p>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full border-t border-border/60 bg-background/95 px-4 pb-[calc(var(--sab)+12px)] pt-3 backdrop-blur md:max-w-[430px]">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-semibold text-muted-foreground">{MODES[mode].label}</p>
            <p className="text-lg font-black tabular-nums text-foreground">₹{fee}</p>
          </div>
          <Button className="h-12 rounded-2xl px-6 text-[15px] font-bold" onClick={book}>
            {mode === "physical" ? "Book clinic visit" : "Book consultation"}
          </Button>
        </div>
      </div>
    </MobileLayout>
  );
};

export default DoctorProfileScreen;
