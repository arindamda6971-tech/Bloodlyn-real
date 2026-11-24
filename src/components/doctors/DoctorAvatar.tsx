import { doctorInitials } from "@/lib/doctor-finder";

// Soft tints with coloured initials: calmer than bright gradients next to real photos.
const TONES = [
  "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
];

/** A steady colour per doctor, so the same doctor always looks the same. */
const toneOf = (seed: string) => TONES[[...seed].reduce((sum, c) => sum + c.charCodeAt(0), 0) % TONES.length];

/** The doctor's photo, or their initials on a colour when they haven't added one. */
export function DoctorAvatar({ name, image, id, className = "h-16 w-16 rounded-2xl text-lg" }: { name: string; image?: string; id: string | number; className?: string }) {
  if (image) return <img src={image} alt="" loading="lazy" decoding="async" className={`${className} shrink-0 bg-muted object-cover`} />;
  return (
    <div aria-hidden className={`${className} flex shrink-0 items-center justify-center font-bold tracking-wide ${toneOf(String(id))}`}>
      {doctorInitials(name)}
    </div>
  );
}
