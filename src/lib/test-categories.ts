import {
  Activity,
  Atom,
  Beaker,
  Bug,
  Dna,
  Droplet,
  Droplets,
  FlaskConical,
  FlaskRound,
  HeartPulse,
  Microscope,
  Pill,
  Ribbon,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  TestTubes,
  Thermometer,
  Wind,
  type LucideIcon,
} from "lucide-react";

export interface TestCategoryStyle {
  icon: LucideIcon;
  /** Plain-language line so lab department names make sense to patients. */
  blurb: string;
}

// Admin category slugs, in the order patients look for them. Icons are drawn in the
// single brand colour (see IconTile) — no per-category colours.
const CATEGORY_STYLES: Record<string, TestCategoryStyle> = {
  "clinical-chemistry": { icon: FlaskConical, blurb: "Sugar, liver, kidney & lipids" },
  hematology: { icon: Droplet, blurb: "Blood count, hemoglobin & HbA1c" },
  "hormones-endocrinology": { icon: Activity, blurb: "Thyroid, PCOS & fertility" },
  "vitamins-nutrition": { icon: Pill, blurb: "Vitamin D, B12, iron & minerals" },
  "infectious-disease": { icon: Thermometer, blurb: "Fever, dengue, typhoid & malaria" },
  "urine-stool-body-fluids": { icon: Beaker, blurb: "Urine, stool & fluid tests" },
  "cardiac-markers": { icon: HeartPulse, blurb: "Troponin & heart risk markers" },
  allergy: { icon: Wind, blurb: "Food, dust & pollen panels" },
  "serology-immunology": { icon: ShieldCheck, blurb: "Antibodies, autoimmune & arthritis" },
  coagulation: { icon: Droplets, blurb: "PT/INR, clotting & bleeding" },
  "tumor-markers": { icon: Ribbon, blurb: "Cancer screening markers" },
  microbiology: { icon: Bug, blurb: "Cultures & infection detection" },
  "toxicology-drug-testing": { icon: FlaskRound, blurb: "Drug & toxin screening" },
  genetics: { icon: Dna, blurb: "Hereditary & genetic risk" },
  "molecular-diagnostics": { icon: Atom, blurb: "PCR & gene panels" },
  cytology: { icon: Microscope, blurb: "Cell studies & Pap smear" },
  histopathology: { icon: ScanSearch, blurb: "Biopsy & tissue studies" },
  specialized: { icon: Sparkles, blurb: "Advanced & specialty tests" },
};

const SLUG_ORDER = Object.keys(CATEGORY_STYLES);

const FALLBACK: TestCategoryStyle = { icon: TestTubes, blurb: "Lab tests" };

export function getTestCategoryStyle(slug: string): TestCategoryStyle {
  return CATEGORY_STYLES[slug] ?? FALLBACK;
}

/** Known categories in patient-friendly order; any new Admin category follows, A–Z. */
export function compareCategories(a: { slug: string; name: string }, b: { slug: string; name: string }): number {
  const ia = SLUG_ORDER.indexOf(a.slug);
  const ib = SLUG_ORDER.indexOf(b.slug);
  if (ia !== -1 || ib !== -1) return (ia === -1 ? Infinity : ia) - (ib === -1 ? Infinity : ib);
  return a.name.localeCompare(b.name);
}

/** "Popular searches" on Explore Tests; each runs the smart search. */
export const POPULAR_SEARCHES = [
  "Blood sugar",
  "Thyroid",
  "CBC",
  "Vitamin D",
  "Lipid profile",
  "Liver function",
  "Kidney function",
  "HbA1c",
  "Vitamin B12",
  "Iron",
];

/**
 * A free-licence Unsplash photo (images.unsplash.com — never plus.unsplash.com, whose
 * premium photos need a paid licence), cropped and served as AVIF/WebP by Unsplash's
 * CDN at roughly 2× the size it is shown, so each tile is only ~10–30 KB.
 */
export const unsplashPhoto = (id: string, width: number, height: number) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&h=${height}&q=70`;

/** Explore Tests hero: a healthcare worker drawing blood. */
export const EXPLORE_HERO_PHOTO = unsplashPhoto("photo-1615461066159-fea0960485d5", 800, 440);

export interface HealthConcern {
  label: string;
  /** Key tests, so the tile says what it covers. */
  hint: string;
  search: string;
  photo: string;
}

const concernPhoto = (id: string) => unsplashPhoto(id, 360, 280);

/** "Browse by health concern" on Explore Tests; each runs the smart search. */
export const HEALTH_CONCERNS: HealthConcern[] = [
  { label: "Diabetes", hint: "Glucose, HbA1c", search: "diabetes", photo: concernPhoto("photo-1683727186226-910f31a9da45") },
  { label: "Thyroid", hint: "TSH, T3, T4", search: "thyroid", photo: concernPhoto("photo-1561228987-8e7379dde477") },
  { label: "Heart", hint: "Lipids, troponin", search: "heart", photo: concernPhoto("photo-1618939304347-e91b1f33d2ab") },
  { label: "Liver", hint: "LFT, bilirubin", search: "liver", photo: concernPhoto("photo-1559757175-0828e13882ed") },
  { label: "Kidney", hint: "KFT, creatinine", search: "kidney", photo: concernPhoto("photo-1559757175-053139280de2") },
  { label: "Vitamins", hint: "D, B12, iron", search: "vitamins", photo: concernPhoto("photo-1707129785947-ddc627a8bab9") },
  { label: "Fever", hint: "Dengue, typhoid, CBC", search: "fever", photo: concernPhoto("photo-1580917922805-f8f57e08c0ae") },
  { label: "Women's health", hint: "PCOS, hormones", search: "pcos", photo: concernPhoto("photo-1638202993928-7267aad84c31") },
  { label: "Bones", hint: "Calcium, vitamin D", search: "bone", photo: concernPhoto("photo-1530497610245-94d3c16cda28") },
  { label: "Full body", hint: "Health packages", search: "full body", photo: concernPhoto("photo-1666887360680-9dc27a1d2753") },
];
