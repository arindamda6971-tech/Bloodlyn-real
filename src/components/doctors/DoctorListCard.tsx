import { BadgeCheck, BriefcaseMedical, Languages, Phone, Star, Video } from "lucide-react";
import type { Doctor } from "@/types/consultation";
import { doctorName, specialtyOf } from "@/lib/doctor-finder";
import { feeOf } from "./consultModes";
import { DoctorAvatar } from "./DoctorAvatar";

interface Props {
  doctor: Doctor;
  onOpen: () => void;
  onBook: () => void;
}

const MODE = {
  video: { label: "Video", icon: Video },
  audio: { label: "Audio", icon: Phone },
} as const;

/**
 * One doctor in the list: who they are, whether they can be booked today, what each kind
 * of consultation costs, and Book. Tapping the doctor opens their page.
 */
export function DoctorListCard({ doctor, onOpen, onBook }: Props) {
  const name = doctorName(doctor.name);
  const specialty = doctor.specialty || specialtyOf(doctor)?.label || "Doctor";
  const modes = (["video", "audio"] as const).filter((m) => feeOf(doctor, m) > 0);
  const languages = (doctor.languages ?? []).filter(Boolean).slice(0, 3);
  const full = !!doctor.fullToday;

  return (
    <article className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_28px_-20px_rgba(15,23,42,0.28)]">
      <button type="button" onClick={onOpen} className="flex w-full gap-3.5 p-4 text-left transition-colors active:bg-muted/50" aria-label={`About ${name}`}>
        <DoctorAvatar name={doctor.name} image={doctor.image} id={doctor.id} className="h-[60px] w-[60px] rounded-2xl text-lg" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <h3 className="flex min-w-0 flex-1 items-center gap-1 text-[15px] font-bold leading-snug text-foreground">
              <span className="truncate">{name}</span>
              <BadgeCheck className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" aria-label="Verified by BloodLyn" />
            </h3>
            {doctor.reviews > 0 ? (
              <span
                className="inline-flex shrink-0 items-center gap-0.5 rounded-lg bg-amber-50 px-1.5 py-0.5 text-[11px] font-bold text-amber-800 ring-1 ring-amber-200/70 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20"
                aria-label={`Rated ${doctor.rating.toFixed(1)} by ${doctor.reviews} patients`}
              >
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden />
                {doctor.rating.toFixed(1)}
                <span className="font-semibold text-amber-700/70 dark:text-amber-300/70">({doctor.reviews})</span>
              </span>
            ) : (
              <span className="shrink-0 rounded-lg bg-sky-50 px-1.5 py-0.5 text-[11px] font-bold text-sky-700 ring-1 ring-sky-100 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/20">
                New
              </span>
            )}
          </div>
          <p className="truncate text-[13px] font-semibold text-primary">{specialty}</p>
          {doctor.qualification && <p className="truncate text-xs text-muted-foreground">{doctor.qualification}</p>}
          {(doctor.experience > 0 || languages.length > 0) && (
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] font-medium text-muted-foreground">
              {doctor.experience > 0 && (
                <span className="inline-flex items-center gap-1">
                  <BriefcaseMedical className="h-3.5 w-3.5" aria-hidden /> {doctor.experience} yrs experience
                </span>
              )}
              {languages.length > 0 && (
                <span className="inline-flex min-w-0 items-center gap-1">
                  <Languages className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span className="truncate">{languages.join(", ")}</span>
                </span>
              )}
            </p>
          )}
        </div>
      </button>

      <div className="flex items-center gap-3 border-t border-border/60 bg-muted/30 px-4 py-3">
        <div className="min-w-0 flex-1">
          {full ? (
            <p className="flex items-center gap-1.5 text-[11.5px] font-semibold text-amber-700 dark:text-amber-400">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden /> Fully booked for today
            </p>
          ) : (
            <p className="flex items-center gap-1.5 text-[11.5px] font-semibold text-emerald-700 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden /> Available today
            </p>
          )}
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[13px]">
            {modes.map((m) => {
              const { label, icon: Icon } = MODE[m];
              return (
                <span key={m} className="inline-flex items-center gap-1 text-muted-foreground">
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                  {label}
                  <span className="font-bold tabular-nums text-foreground">₹{feeOf(doctor, m)}</span>
                </span>
              );
            })}
          </p>
        </div>
        <button
          type="button"
          onClick={onBook}
          disabled={full}
          className="h-10 shrink-0 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/30 transition-transform active:scale-[0.97] disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none"
        >
          Book
        </button>
      </div>
    </article>
  );
}
