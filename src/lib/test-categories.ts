import {
  Activity,
  Atom,
  Beaker,
  Bone,
  Bug,
  ClipboardList,
  Dna,
  Droplet,
  Droplets,
  FlaskConical,
  FlaskRound,
  Flower2,
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

export interface HealthConcern {
  label: string;
  /** Key tests, so the tile says what it covers. */
  hint: string;
  search: string;
  icon: LucideIcon;
}

/** "Browse by health concern" on Explore Tests; each runs the smart search. */
export const HEALTH_CONCERNS: HealthConcern[] = [
  { label: "Diabetes", hint: "Glucose, HbA1c", search: "diabetes", icon: Droplet },
  { label: "Thyroid", hint: "TSH, T3, T4", search: "thyroid", icon: Activity },
  { label: "Heart", hint: "Lipids, troponin", search: "heart", icon: HeartPulse },
  { label: "Liver", hint: "LFT, bilirubin", search: "liver", icon: FlaskConical },
  { label: "Kidney", hint: "KFT, creatinine", search: "kidney", icon: Beaker },
  { label: "Vitamins", hint: "D, B12, iron", search: "vitamins", icon: Pill },
  { label: "Fever", hint: "Dengue, typhoid, CBC", search: "fever", icon: Thermometer },
  { label: "Women's health", hint: "PCOS, hormones", search: "pcos", icon: Flower2 },
  { label: "Bones", hint: "Calcium, vitamin D", search: "bone", icon: Bone },
  { label: "Full body", hint: "Health packages", search: "full body", icon: ClipboardList },
];
