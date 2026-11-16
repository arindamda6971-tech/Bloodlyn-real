import { useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { BadgeCheck, Check, FileText, Phone, ShieldCheck, Star, Video, Wallet } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import ScreenHeader from "@/components/layout/ScreenHeader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DoctorAvatar } from "@/components/doctors/DoctorAvatar";
import { MODES, feeOf } from "@/components/doctors/consultModes";
import { useDoctor } from "@/hooks/useDoctors";
import { useSEO } from "@/hooks/useSEO";
import { doctorName, onlineFee, specialtyByKey, specialtyOf, type ConsultType } from "@/lib/doctor-finder";
import type { BookDoctorState } from "@/pages/BookDoctorScreen";

const STEPS: Array<{ icon: typeof Video; title: string; text: string }> = [
  { icon: Check, title: "Book today or a later day", text: "Tell the doctor briefly what's wrong. No payment now." },
  { icon: Phone, title: "Your phone rings", text: "When the doctor starts, BloodLyn rings and you join on Google Meet." },
  { icon: FileText, title: "Prescription in the app", text: "Medicines and tests arrive here. Add the tests to your cart in one tap." },
  { icon: Wallet, title: "Pay after the consultation", text: "You pay only once you've spoken to the doctor." },
];

/** A doctor's page: who they are, video or audio and for how much, then booking. */
const DoctorProfileScreen = () => {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { doctor, isLoading, isError } = useDoctor(id);
  useSEO({ title: doctor ? `${doctorName(doctor.name)} | BloodLyn` : "Doctor | BloodLyn", description: "Book an online consultation with a verified doctor." });

  const offered = doctor ? (["video", "audio"] as ConsultType[]).filter((m) => feeOf(doctor, m) > 0) : [];
  const [picked, setPicked] = useState<ConsultType | null>(null);
  const mode = picked && offered.includes(picked) ? picked : offered[0];

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

  const fee = feeOf(doctor, mode);
  const specialty = doctor.specialty || specialtyOf(doctor)?.label || "Doctor";

  const book = () => {
    const state: BookDoctorState = {
      doctor,
      type: mode,
      specialty: specialtyByKey(params.get("specialty"))?.key ?? specialtyOf(doctor)?.key ?? null,
    };
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
              <p className="text-base font-black text-foreground">₹{onlineFee(doctor)}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Fee from</p>
            </div>
          </div>
        </section>

        <section>
          <h3 className="mb-2.5 text-sm font-black text-foreground">How do you want to talk?</h3>
          <div className="space-y-2" role="radiogroup" aria-label="Consultation type">
            {offered.map((m) => {
              const info = MODES[m];
              const active = m === mode;
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
                  <span className="text-base font-black tabular-nums text-foreground">₹{feeOf(doctor, m)}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl border border-border/60 bg-card p-4">
          <h3 className="text-sm font-black text-foreground">What happens next</h3>
          <ol className="mt-3 space-y-3.5">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-3">
                <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <s.icon className="h-4 w-4" />
                  {i < STEPS.length - 1 && <span className="absolute left-1/2 top-8 h-3.5 w-px -translate-x-1/2 bg-border" />}
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
            Book consultation
          </Button>
        </div>
      </div>
    </MobileLayout>
  );
};

export default DoctorProfileScreen;
