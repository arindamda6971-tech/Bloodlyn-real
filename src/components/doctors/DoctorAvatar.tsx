import { doctorInitials } from "@/lib/doctor-finder";

const TONES = [
  "from-sky-500 to-blue-600",
  "from-emerald-500 to-teal-600",
  "from-violet-500 to-indigo-600",
  "from-rose-500 to-pink-600",
  "from-amber-500 to-orange-600",
];

/** A steady colour per doctor, so the same doctor always looks the same. */
const toneOf = (seed: string) => TONES[[...seed].reduce((sum, c) => sum + c.charCodeAt(0), 0) % TONES.length];

/** The doctor's photo, or their initials on a colour when they haven't added one. */
export function DoctorAvatar({ name, image, id, className = "h-16 w-16 rounded-2xl text-lg" }: { name: string; image?: string; id: string | number; className?: string }) {
  if (image) return <img src={image} alt="" loading="lazy" decoding="async" className={`${className} shrink-0 object-cover`} />;
  return (
    <div aria-hidden className={`${className} flex shrink-0 items-center justify-center bg-gradient-to-br font-black text-white ${toneOf(String(id))}`}>
      {doctorInitials(name)}
    </div>
  );
}
