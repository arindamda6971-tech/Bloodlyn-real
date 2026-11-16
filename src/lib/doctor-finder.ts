/**
 * Finding a doctor: the specialties a patient can filter by, the everyday problems that
 * lead to one, and the filtering and sorting of the doctor list. Doctors write their own
 * specialty in the Partner Portal ("Family Medicine", "MD (Medicine)", "Skin & VD"), so
 * each specialty here is recognised by a few words rather than an exact name.
 */
import type { Doctor } from "@/types/consultation";

export type ConsultMode = "online" | "clinic";
export type DoctorSort = "recommended" | "fee" | "experience";

export interface Specialty {
  key: string;
  label: string;
  /** Words in a doctor's own specialty or qualification that mean this one. */
  match: RegExp;
}

export const SPECIALTIES: Specialty[] = [
  { key: "general", label: "General Physician", match: /general|family|internal|physician|\bgp\b|medicine|m\.?b\.?b\.?s/i },
  { key: "skin", label: "Skin & Hair", match: /derma|skin|hair|cosmet|venere/i },
  { key: "women", label: "Women's Health", match: /gyn|obst|women|fertil/i },
  { key: "child", label: "Child Specialist", match: /pa?ediat|child|neonat/i },
  { key: "heart", label: "Heart", match: /cardi|heart/i },
  { key: "bones", label: "Bones & Joints", match: /ortho|bone|joint|spine|rheumat/i },
  { key: "ent", label: "Ear, Nose, Throat", match: /\bent\b|otorhino|\bears?\b|throat/i },
  { key: "eye", label: "Eye", match: /ophthal|\beye|optom|retina/i },
  { key: "teeth", label: "Teeth", match: /dentist|dental|\bdent|teeth|tooth|\boral\b|\bb\.?d\.?s\b/i },
  { key: "mind", label: "Mental Health", match: /psych|mental|counsel/i },
  { key: "diabetes", label: "Diabetes & Thyroid", match: /endocr|diabet|thyroid|hormone/i },
  { key: "stomach", label: "Stomach & Liver", match: /gastro|liver|hepat|stomach|digest/i },
  { key: "brain", label: "Brain & Nerves", match: /neuro|brain|nerve/i },
  { key: "lungs", label: "Chest & Lungs", match: /pulmo|chest|lung|respir|asthma/i },
  { key: "kidney", label: "Kidney & Urine", match: /nephro|kidney|\burolog|urine/i },
  { key: "diet", label: "Diet & Nutrition", match: /diet|nutri/i },
];

const BY_KEY = new Map(SPECIALTIES.map((s) => [s.key, s]));
export const specialtyByKey = (key: string | null | undefined) => (key ? BY_KEY.get(key) ?? null : null);

/**
 * The specialty a doctor practises: their written specialty decides, so a "Dermatologist"
 * with an MBBS is a skin doctor, not a general physician. Null when nothing matches.
 */
export function specialtyOf(doctor: Pick<Doctor, "specialty" | "qualification">): Specialty | null {
  const written = doctor.specialty || "";
  // General words ("medicine", "MBBS") come last, so the more specific one wins.
  const specific = SPECIALTIES.filter((s) => s.key !== "general");
  return (
    specific.find((s) => s.match.test(written)) ??
    (SPECIALTIES[0].match.test(written) ? SPECIALTIES[0] : null) ??
    specific.find((s) => s.match.test(doctor.qualification || "")) ??
    (SPECIALTIES[0].match.test(doctor.qualification || "") ? SPECIALTIES[0] : null)
  );
}

/** Everyday problems, each with the specialties that treat it (first is best). */
export interface Problem {
  key: string;
  label: string;
  specialties: string[];
}

export const PROBLEMS: Problem[] = [
  { key: "fever", label: "Fever", specialties: ["general", "child"] },
  { key: "cold", label: "Cold & cough", specialties: ["general", "lungs", "ent", "child"] },
  { key: "stomach", label: "Stomach ache", specialties: ["stomach", "general"] },
  { key: "skin", label: "Skin rash", specialties: ["skin"] },
  { key: "hair", label: "Hair fall", specialties: ["skin"] },
  { key: "periods", label: "Periods", specialties: ["women"] },
  { key: "pregnancy", label: "Pregnancy", specialties: ["women"] },
  { key: "child", label: "Child unwell", specialties: ["child", "general"] },
  { key: "bp", label: "High BP", specialties: ["heart", "general"] },
  { key: "sugar", label: "Diabetes", specialties: ["diabetes", "general"] },
  { key: "thyroid", label: "Thyroid", specialties: ["diabetes", "general"] },
  { key: "joint", label: "Joint pain", specialties: ["bones", "general"] },
  { key: "back", label: "Back pain", specialties: ["bones", "general"] },
  { key: "headache", label: "Headache", specialties: ["general", "brain"] },
  { key: "anxiety", label: "Stress & anxiety", specialties: ["mind"] },
  { key: "eye", label: "Eye problem", specialties: ["eye"] },
  { key: "ear", label: "Ear or throat", specialties: ["ent", "general"] },
  { key: "tooth", label: "Toothache", specialties: ["teeth"] },
  { key: "weight", label: "Weight", specialties: ["diet", "diabetes", "general"] },
];

export const problemByKey = (key: string | null | undefined) => (key ? PROBLEMS.find((p) => p.key === key) ?? null : null);

/** The fee for a mode, 0 when the doctor doesn't offer it. Online is the cheaper of video and audio. */
export function feeFor(doctor: Doctor, mode: ConsultMode): number {
  if (mode === "clinic") return doctor.physicalCallFee || 0;
  const fees = [doctor.videoCallFee, doctor.audioCallFee].filter((f) => f > 0);
  return fees.length ? Math.min(...fees) : 0;
}

export const offers = (doctor: Doctor, mode: ConsultMode) => feeFor(doctor, mode) > 0;

/** The specialties that have at least one doctor for this mode, most doctors first. */
export function specialtiesWithDoctors(doctors: Doctor[], mode: ConsultMode): Array<Specialty & { count: number }> {
  const counts = new Map<string, number>();
  for (const d of doctors) {
    if (!offers(d, mode)) continue;
    const s = specialtyOf(d);
    if (s) counts.set(s.key, (counts.get(s.key) ?? 0) + 1);
  }
  return SPECIALTIES.filter((s) => counts.has(s.key))
    .map((s) => ({ ...s, count: counts.get(s.key)! }))
    .sort((a, b) => b.count - a.count);
}

export interface DoctorQuery {
  mode: ConsultMode;
  specialty?: string | null;
  problem?: string | null;
  search?: string;
  sort?: DoctorSort;
}

export interface DoctorResults {
  doctors: Doctor[];
  /**
   * Set when no doctor of the problem's own specialty is on BloodLyn yet and the list
   * shows the next specialty that treats it (often a general physician) instead.
   */
  fallbackFrom: Specialty | null;
}

const searchText = (d: Doctor) =>
  [d.name, d.specialty, d.qualification, d.hospitalName, d.city, specialtyOf(d)?.label].filter(Boolean).join(" ").toLowerCase();

/** The doctors to show for what the patient chose. */
export function findDoctors(all: Doctor[], q: DoctorQuery): DoctorResults {
  let list = all.filter((d) => offers(d, q.mode));

  const words = (q.search ?? "").toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length) list = list.filter((d) => words.every((w) => searchText(d).includes(w)));

  let fallbackFrom: Specialty | null = null;
  const problem = problemByKey(q.problem);
  if (q.specialty) {
    list = list.filter((d) => specialtyOf(d)?.key === q.specialty);
  } else if (problem) {
    // The problem's first specialty that has a doctor.
    const key = problem.specialties.find((k) => list.some((d) => specialtyOf(d)?.key === k));
    if (key && key !== problem.specialties[0]) fallbackFrom = specialtyByKey(problem.specialties[0]);
    list = key ? list.filter((d) => specialtyOf(d)?.key === key) : [];
  }

  const sort = q.sort ?? "recommended";
  const sorted = [...list].sort((a, b) => {
    if (sort === "fee") return feeFor(a, q.mode) - feeFor(b, q.mode);
    if (sort === "experience") return b.experience - a.experience;
    // Recommended: real ratings first, then experience.
    const rated = (d: Doctor) => (d.reviews > 0 ? d.rating : 0);
    return rated(b) - rated(a) || b.experience - a.experience;
  });
  return { doctors: sorted, fallbackFrom };
}

/** "Dr Ar Das" -> "AD" */
export function doctorInitials(name: string): string {
  const parts = name.replace(/^dr\.?\s+/i, "").split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "DR";
}

/** "Dr " in front, once. */
export const doctorName = (name: string) => (/^dr\.?\s/i.test(name.trim()) ? name.trim() : `Dr ${name.trim()}`);

/** The mode a "Book" tap starts with: video when the doctor offers it. */
export const defaultType = (doctor: Doctor, mode: ConsultMode): "video" | "audio" | "physical" =>
  mode === "clinic" ? "physical" : doctor.videoCallFee > 0 ? "video" : "audio";
