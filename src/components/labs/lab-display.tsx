import { Star } from "lucide-react";
import { useLabSlots } from "@/hooks/useLabSlots";
import { isLabOpenOnDayOffset } from "@/lib/lab-slots";

// Shared, truthful pieces for showing a partner lab: its logo or initials, and
// its rating only when real reviews exist ("New" otherwise — never a made-up 4.5).

const AVATAR_TINTS = [
  "bg-sky-100 text-sky-700",
  "bg-emerald-100 text-emerald-700",
  "bg-violet-100 text-violet-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-teal-100 text-teal-700",
  "bg-indigo-100 text-indigo-700",
];

export function labInitials(name: string): string {
  const words = (name || "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "L";
  const letters = words.length === 1 ? words[0].slice(0, 2) : words[0][0] + words[1][0];
  return letters.toUpperCase();
}

function tintFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return AVATAR_TINTS[Math.abs(h) % AVATAR_TINTS.length];
}

export const LabAvatar = ({ name, logoUrl, className = "w-14 h-14 rounded-xl" }: { name: string; logoUrl?: string | null; className?: string }) =>
  logoUrl ? (
    <div className={`${className} bg-white border border-border/60 flex items-center justify-center flex-shrink-0 overflow-hidden`}>
      <img loading="lazy" decoding="async" width={40} height={40} src={logoUrl} alt={name} className="w-10 h-10 object-contain" />
    </div>
  ) : (
    <div className={`${className} ${tintFor(name)} flex items-center justify-center flex-shrink-0 font-bold text-base`} aria-hidden="true">
      {labInitials(name)}
    </div>
  );

/** True when the lab has a rating backed by at least one review. */
export const hasRealRating = (rating?: number | null, reviews?: number | null) => !!rating && (reviews ?? 0) > 0;

export const LabRating = ({ rating, reviews }: { rating?: number | null; reviews?: number | null }) =>
  hasRealRating(rating, reviews) ? (
    <span className="inline-flex items-center gap-1">
      <Star className="w-3.5 h-3.5 text-warning fill-warning" />
      <span className="text-sm font-medium text-foreground">{Number(rating).toFixed(1)}</span>
      <span className="text-xs text-muted-foreground">({(reviews ?? 0).toLocaleString("en-IN")})</span>
    </span>
  ) : (
    <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">New</span>
  );

/**
 * "Open" / "Closed" for today, from the lab's Partner schedule — the same source
 * and rule the booking flow uses, so the badge never disagrees with booking.
 * A lab switched off by the admin is closed; nothing shows while loading.
 */
export const LabOpenBadge = ({ vendorId, isActive }: { vendorId?: string | null; isActive?: boolean | null }) => {
  const { data, isLoading } = useLabSlots(isActive === false ? null : vendorId);
  let open: boolean | null = null;
  if (isActive === false) open = false;
  else if (vendorId && !isLoading && data) open = isLabOpenOnDayOffset(data.byDay, data.hasSchedule, 0);
  if (open === null) return null;
  return open ? (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
      Open
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" aria-hidden="true" />
      Closed
    </span>
  );
};
