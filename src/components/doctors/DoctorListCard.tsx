import { BadgeCheck, Phone, Star, Video } from "lucide-react";
import type { Doctor } from "@/types/consultation";
import { doctorName, onlineFee, specialtyOf } from "@/lib/doctor-finder";
import { DoctorAvatar } from "./DoctorAvatar";

interface Props {
  doctor: Doctor;
  onOpen: () => void;
  onBook: () => void;
}

/** One doctor in the list: who they are, how they consult, and their fee. */
export function DoctorListCard({ doctor, onOpen, onBook }: Props) {
  const specialty = doctor.specialty || specialtyOf(doctor)?.label || "Doctor";

  return (
    <article className="rounded-3xl border border-border/60 bg-card p-4 shadow-[0_6px_20px_-12px_rgba(15,23,42,0.18)]">
      <button type="button" onClick={onOpen} className="flex w-full items-start gap-3.5 text-left" aria-label={`About ${doctorName(doctor.name)}`}>
        <DoctorAvatar name={doctor.name} image={doctor.image} id={doctor.id} />
        <div className="min-w-0 flex-1">
          <h3 className="flex items-center gap-1 text-[15px] font-extrabold leading-tight text-foreground">
            <span className="truncate">{doctorName(doctor.name)}</span>
            <BadgeCheck className="h-4 w-4 shrink-0 text-sky-600" aria-label="Verified by BloodLyn" />
          </h3>
          <p className="mt-0.5 truncate text-[13px] font-semibold text-primary">{specialty}</p>
          {doctor.qualification && <p className="truncate text-xs text-muted-foreground">{doctor.qualification}</p>}
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] font-semibold text-muted-foreground">
            {doctor.experience > 0 && <span>{doctor.experience} yrs experience</span>}
            {doctor.reviews > 0 ? (
              <span className="inline-flex items-center gap-0.5 text-foreground">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {doctor.rating.toFixed(1)}
                <span className="font-medium text-muted-foreground">({doctor.reviews})</span>
              </span>
            ) : (
              <span className="text-emerald-700 dark:text-emerald-400">New on BloodLyn</span>
            )}
          </p>
        </div>
      </button>

      <div className="mt-3.5 flex items-center gap-3 border-t border-border/50 pt-3.5">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold text-muted-foreground">Consultation fee</p>
          <p className="flex items-center gap-2">
            <span className="text-lg font-black tabular-nums text-foreground">₹{onlineFee(doctor)}</span>
            <span className="flex items-center gap-1 text-muted-foreground">
              {doctor.videoCallFee > 0 && <Video className="h-3.5 w-3.5" aria-label="Video call" />}
              {doctor.audioCallFee > 0 && <Phone className="h-3.5 w-3.5" aria-label="Audio call" />}
            </span>
          </p>
        </div>
        <button
          type="button"
          onClick={onBook}
          className="h-11 shrink-0 rounded-2xl bg-primary px-5 text-sm font-bold text-primary-foreground shadow-sm shadow-primary/25 transition-transform active:scale-[0.97]"
        >
          Book now
        </button>
      </div>
    </article>
  );
}
