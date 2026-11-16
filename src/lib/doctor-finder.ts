/**
 * Finding a doctor: the medical specialties a patient picks from, the common problems
 * of each (offered on the booking page), and the filtering and sorting of the doctor
 * list. Consultations are online only (video or audio on Google Meet). Doctors write
 * their own specialty in the Partner Portal ("Family Medicine", "MD (Medicine)",
 * "Skin & VD"), so each specialty is recognised by a few words, not an exact name.
 */
import type { Doctor } from "@/types/consultation";

export type DoctorSort = "recommended" | "fee" | "experience";
export type ConsultType = "video" | "audio";

export interface Specialty {
  key: string;
  label: string;
  /** What it covers, in a patient's words. */
  hint: string;
  /** Words in a doctor's own specialty or qualification that mean this one. */
  match: RegExp;
  /** Common problems, offered as quick picks when booking. */
  problems: string[];
}

export const SPECIALTIES: Specialty[] = [
  {
    key: "general",
    label: "General Physician",
    hint: "Fever, cold, body ache",
    match: /general|family|internal|physician|\bgp\b|medicine|m\.?b\.?b\.?s/i,
    problems: ["Fever", "Cold & cough", "Headache", "Body ache", "Stomach ache", "Vomiting or loose motion", "Leg or joint pain", "Weakness", "BP or sugar check"],
  },
  {
    key: "women",
    label: "Gynaecologist",
    hint: "Periods, pregnancy",
    match: /gyn|obst|women|fertil/i,
    problems: ["Irregular periods", "Period pain", "Pregnancy", "White discharge", "PCOS / PCOD", "Planning a baby", "Menopause"],
  },
  {
    key: "child",
    label: "Paediatrician",
    hint: "Child health",
    match: /pa?ediat|child|neonat/i,
    problems: ["Fever in child", "Cough & cold", "Loose motion", "Not eating well", "Skin rash", "Growth concern", "Vaccination advice"],
  },
  {
    key: "skin",
    label: "Dermatologist",
    hint: "Skin, hair, nails",
    match: /derma|skin|hair|cosmet|venere/i,
    problems: ["Acne / pimples", "Rash or itching", "Hair fall", "Dandruff", "Fungal infection", "Dark spots", "Nail problem"],
  },
  {
    key: "ent",
    label: "ENT Specialist",
    hint: "Ear, nose, throat",
    match: /\bent\b|otorhino|\bears?\b|throat/i,
    problems: ["Ear pain", "Ear discharge", "Blocked nose / sinus", "Sore throat", "Hearing problem", "Tonsils", "Nose bleed"],
  },
  {
    key: "eye",
    label: "Eye Specialist",
    hint: "Vision, eye pain",
    match: /ophthal|\beye|optom|retina/i,
    problems: ["Red eyes", "Blurred vision", "Itchy or watery eyes", "Eye pain", "Spectacle check", "Swelling around eye"],
  },
  {
    key: "teeth",
    label: "Dentist",
    hint: "Teeth and gums",
    match: /dentist|dental|\bdent|teeth|tooth|\boral\b|\bb\.?d\.?s\b/i,
    problems: ["Toothache", "Bleeding gums", "Sensitive teeth", "Mouth ulcers", "Bad breath", "Swollen gums"],
  },
  {
    key: "bones",
    label: "Orthopaedic",
    hint: "Bones and joints",
    match: /ortho|bone|joint|spine|rheumat/i,
    problems: ["Back pain", "Knee pain", "Joint pain", "Neck or shoulder pain", "Sprain or injury", "Heel pain"],
  },
  {
    key: "heart",
    label: "Cardiologist",
    hint: "Heart and BP",
    match: /cardi|heart/i,
    problems: ["Chest pain", "High BP", "Breathlessness", "Fast heartbeat", "High cholesterol", "Swelling in feet"],
  },
  {
    key: "diabetes",
    label: "Diabetes & Thyroid",
    hint: "Sugar, thyroid, hormones",
    match: /endocr|diabet|thyroid|hormone/i,
    problems: ["High sugar", "Low sugar", "Thyroid problem", "Weight gain", "Hormone problem", "PCOS / PCOD"],
  },
  {
    key: "stomach",
    label: "Gastroenterologist",
    hint: "Stomach and liver",
    match: /gastro|liver|hepat|stomach|digest/i,
    problems: ["Acidity / gas", "Stomach pain", "Constipation", "Loose motion", "Piles", "Liver problem", "Jaundice"],
  },
  {
    key: "lungs",
    label: "Pulmonologist",
    hint: "Chest and breathing",
    match: /pulmo|chest|lung|respir|asthma|\btb\b/i,
    problems: ["Cough for weeks", "Asthma", "Breathlessness", "Wheezing", "Snoring", "TB follow-up"],
  },
  {
    key: "brain",
    label: "Neurologist",
    hint: "Brain and nerves",
    match: /neuro|brain|nerve/i,
    problems: ["Migraine", "Dizziness", "Numbness or tingling", "Fits / seizures", "Memory problem", "Shaking hands"],
  },
  {
    key: "mind",
    label: "Psychiatrist",
    hint: "Mental health",
    match: /psych|mental|counsel/i,
    problems: ["Stress & anxiety", "Low mood", "Can't sleep", "Panic attacks", "Anger problems", "Addiction"],
  },
  {
    key: "kidney",
    label: "Nephrologist",
    hint: "Kidney",
    match: /nephro|kidney/i,
    problems: ["Swelling in face or legs", "High creatinine", "Kidney stones", "Less urine", "Dialysis advice"],
  },
  {
    key: "sexual",
    label: "Sexologist",
    hint: "Sexual health",
    match: /sexolog|androlog|sexual/i,
    problems: ["Erection problem", "Early ejaculation", "Low desire", "Pain during sex", "Infertility worry"],
  },
  {
    key: "uro",
    label: "Urologist",
    hint: "Urine and prostate",
    match: /\burolog|urine|prostate/i,
    problems: ["Burning urine", "Frequent urination", "Blood in urine", "Stone pain", "Prostate problem"],
  },
  {
    key: "diet",
    label: "Dietitian",
    hint: "Diet and weight",
    match: /diet|nutri/i,
    problems: ["Weight loss", "Weight gain", "Diabetes diet", "PCOS diet", "Pregnancy diet"],
  },
  {
    key: "cancer",
    label: "Oncologist",
    hint: "Cancer care",
    match: /onco|cancer|tumou?r/i,
    problems: ["Lump or swelling", "Cancer follow-up", "Second opinion", "Weight loss without reason"],
  },
  {
    key: "homeo",
    label: "Homeopathy",
    hint: "Homeopathic care",
    match: /homo?eo|\bb\.?h\.?m\.?s\b/i,
    problems: ["Allergy", "Skin problem", "Hair fall", "Long-term problem", "Child's health"],
  },
  {
    key: "ayur",
    label: "Ayurveda",
    hint: "Ayurvedic care",
    match: /ayur|\bb\.?a\.?m\.?s\b/i,
    problems: ["Digestion", "Joint pain", "Stress", "Skin & hair", "Weight"],
  },
];

const BY_KEY = new Map(SPECIALTIES.map((s) => [s.key, s]));
export const specialtyByKey = (key: string | null | undefined) => (key ? BY_KEY.get(key) ?? null : null);

/**
 * The specialty a doctor practises: their written specialty decides, so a "Dermatologist"
 * with an MBBS is a skin doctor, not a general physician. Null when nothing matches.
 */
export function specialtyOf(doctor: Pick<Doctor, "specialty" | "qualification">): Specialty | null {
  const written = doctor.specialty || "";
  const qualification = doctor.qualification || "";
  // General words ("medicine", "MBBS") come last, so the more specific one wins.
  const specific = SPECIALTIES.filter((s) => s.key !== "general");
  const general = SPECIALTIES[0];
  return (
    specific.find((s) => s.match.test(written)) ??
    (general.match.test(written) ? general : null) ??
    specific.find((s) => s.match.test(qualification)) ??
    (general.match.test(qualification) ? general : null)
  );
}

/** The problems to offer when booking: the chosen specialty's, else the doctor's own, else a GP's. */
export function problemsFor(specialtyKey: string | null | undefined, doctor?: Pick<Doctor, "specialty" | "qualification">): string[] {
  return (specialtyByKey(specialtyKey) ?? (doctor ? specialtyOf(doctor) : null) ?? SPECIALTIES[0]).problems;
}

/** The fee to show: the cheaper of video and audio; 0 when the doctor offers neither. */
export function onlineFee(doctor: Doctor): number {
  const fees = [doctor.videoCallFee, doctor.audioCallFee].filter((f) => f > 0);
  return fees.length ? Math.min(...fees) : 0;
}

export const consultsOnline = (doctor: Doctor) => onlineFee(doctor) > 0;

/** How many doctors each specialty has right now. */
export function doctorCounts(doctors: Doctor[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const d of doctors) {
    if (!consultsOnline(d)) continue;
    const s = specialtyOf(d);
    if (s) counts[s.key] = (counts[s.key] ?? 0) + 1;
  }
  return counts;
}

export interface DoctorQuery {
  specialty?: string | null;
  search?: string;
  sort?: DoctorSort;
}

const searchText = (d: Doctor) =>
  [d.name, d.specialty, d.qualification, d.city, specialtyOf(d)?.label].filter(Boolean).join(" ").toLowerCase();

/** The doctors to show for what the patient chose. */
export function findDoctors(all: Doctor[], q: DoctorQuery = {}): Doctor[] {
  let list = all.filter(consultsOnline);

  const words = (q.search ?? "").toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length) list = list.filter((d) => words.every((w) => searchText(d).includes(w)));
  if (q.specialty) list = list.filter((d) => specialtyOf(d)?.key === q.specialty);

  const sort = q.sort ?? "recommended";
  return [...list].sort((a, b) => {
    if (sort === "fee") return onlineFee(a) - onlineFee(b);
    if (sort === "experience") return b.experience - a.experience;
    // Recommended: real ratings first, then experience.
    const rated = (d: Doctor) => (d.reviews > 0 ? d.rating : 0);
    return rated(b) - rated(a) || b.experience - a.experience;
  });
}

/** The way a "Book" tap starts: video when the doctor offers it. */
export const defaultType = (doctor: Doctor): ConsultType => (doctor.videoCallFee > 0 ? "video" : "audio");

/** "Dr Ar Das" -> "AD" */
export function doctorInitials(name: string): string {
  const parts = name.replace(/^dr\.?\s+/i, "").split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "DR";
}

/** "Dr " in front, once. */
export const doctorName = (name: string) => (/^dr\.?\s/i.test(name.trim()) ? name.trim() : `Dr ${name.trim()}`);
