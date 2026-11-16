/**
 * Which labs near the patient can do the tests a doctor prescribed, and at what price.
 * Matching works like the rest of the app (a test page's "Labs near you", lab
 * selection): by test name, exact first, then one name containing the other. A test only
 * counts when the lab gives it a price, because the patient pays online for it.
 */
import { getCommonSpecializedDays } from "@/lib/test-availability";
import { testTitle, type PrescriptionTest } from "@/lib/prescription";

/** The diagnostic_centers columns this needs. */
export interface PrescriptionLabRow {
  id: string;
  name: string;
  vendor_id?: string | null;
  rating?: number | null;
  reviews_count?: number | null;
  logo_url?: string | null;
  pricing?: unknown;
  available_tests?: unknown;
}

/** The products columns this needs (a lab's live tests). */
export interface PrescriptionLabProduct {
  vendor_id: string;
  name?: string | null;
  product_name?: string | null;
  price?: number | string | null;
  availability_type?: string | null;
  available_days?: string[] | null;
  sample_type?: string | null;
  preparation_required?: boolean | null;
  preparation_instruction?: string | null;
  fasting_required?: boolean | null;
  fasting_instruction?: string | null;
  report_type?: string | null;
  report_time?: string | null;
}

/** A prescribed test as one lab does it. */
export interface LabTestMatch {
  test: PrescriptionTest;
  /** The lab's own name for it, which is what the lab sees on the order. */
  name: string;
  price: number;
  availabilityType?: "GENERAL" | "SPECIALIZED";
  availableDays?: string[];
  sampleType?: string;
  preparationRequired?: boolean;
  preparationInstruction?: string;
  fastingRequired?: boolean;
  fastingInstruction?: string;
  reportType?: string;
  reportTime?: string;
}

export interface PrescriptionLabOption {
  lab: PrescriptionLabRow;
  matches: LabTestMatch[];
  /** Prescribed tests this lab doesn't offer. */
  missing: PrescriptionTest[];
  total: number;
  /** Its specialized tests share no collection day, so they can't be booked together. */
  noCommonDay: boolean;
}

/** "Complete  Blood Count\n*Hb ..." -> "complete blood count" */
const key = (name: unknown) =>
  String(name ?? "").split(/\r?\n/)[0].replace(/\s+/g, " ").trim().toLowerCase();

const text = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
const bool = (v: unknown) => (typeof v === "boolean" ? v : undefined);
const positive = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

interface LabEntry extends Omit<LabTestMatch, "test"> {
  key: string;
}

function entryOf(raw: unknown): LabEntry | null {
  if (typeof raw === "string") {
    const k = key(raw);
    return k ? { key: k, name: raw.split(/\r?\n/)[0].trim(), price: 0 } : null;
  }
  if (!raw || typeof raw !== "object") return null;
  const t = raw as Record<string, unknown>;
  const fullName = String(t.test_name ?? t.name ?? t.product_name ?? "");
  const k = key(fullName);
  if (!k) return null;
  const type = String(t.availability_type ?? t.availabilityType ?? "").toUpperCase();
  const days = t.available_days ?? t.availableDays;
  return {
    key: k,
    name: fullName.split(/\r?\n/)[0].trim(),
    price: positive(t.price),
    availabilityType: type === "SPECIALIZED" ? "SPECIALIZED" : type === "GENERAL" ? "GENERAL" : undefined,
    availableDays: Array.isArray(days) ? days.map(String) : undefined,
    sampleType: text(t.sample_type ?? t.sampleType),
    preparationRequired: bool(t.preparation_required ?? t.preparationRequired),
    preparationInstruction: text(t.preparation_instruction ?? t.preparationInstruction),
    fastingRequired: bool(t.fasting_required ?? t.fastingRequired),
    fastingInstruction: text(t.fasting_instruction ?? t.fastingInstruction),
    reportType: text(t.report_type ?? t.reportType),
    reportTime: text(t.report_time ?? t.reportTime),
  };
}

/** The lab's own price list, { "test name": price }. */
function priceList(pricing: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (!pricing || typeof pricing !== "object" || Array.isArray(pricing)) return out;
  for (const [name, price] of Object.entries(pricing as Record<string, unknown>)) {
    const n = positive(price);
    if (n) out[key(name)] = n;
  }
  return out;
}

function findEntry(entries: LabEntry[], wanted: string): LabEntry | undefined {
  return (
    entries.find((e) => e.key === wanted) ??
    entries.find((e) => e.key.includes(wanted) || wanted.includes(e.key))
  );
}

/** One lab's offer for the prescription, or null when it does none of the tests. */
export function labOptionFor(
  tests: PrescriptionTest[],
  lab: PrescriptionLabRow,
  products: PrescriptionLabProduct[] = [],
): PrescriptionLabOption | null {
  // The lab's live products come first: they carry its current price and details.
  const entries = [
    ...products.map(entryOf),
    ...(Array.isArray(lab.available_tests) ? lab.available_tests : []).map(entryOf),
  ].filter((e): e is LabEntry => !!e);
  const prices = priceList(lab.pricing);

  const matches: LabTestMatch[] = [];
  const missing: PrescriptionTest[] = [];
  const used = new Set<LabEntry>();
  for (const test of tests) {
    const wanted = key(testTitle(test));
    const entry = wanted ? findEntry(entries.filter((e) => !used.has(e)), wanted) : undefined;
    const price = entry ? prices[entry.key] ?? prices[wanted] ?? entry.price : 0;
    if (!entry || price <= 0) {
      missing.push(test);
      continue;
    }
    used.add(entry);
    const { key: _key, ...details } = entry;
    matches.push({ ...details, test, price });
  }
  if (matches.length === 0) return null;

  const common = getCommonSpecializedDays(matches);
  return {
    lab,
    matches,
    missing,
    total: matches.reduce((sum, m) => sum + m.price, 0),
    noCommonDay: common !== null && common.length === 0,
  };
}

/**
 * The labs that can do the prescription: those with every test first, then those with
 * the most tests. Within that the labs keep the order they came in (best rated first).
 */
export function labOptionsForPrescription(
  tests: PrescriptionTest[],
  labs: PrescriptionLabRow[],
  productsByVendor: Record<string, PrescriptionLabProduct[]> = {},
): PrescriptionLabOption[] {
  return labs
    .map((lab) => labOptionFor(tests, lab, lab.vendor_id ? productsByVendor[lab.vendor_id] : []))
    .filter((o): o is PrescriptionLabOption => !!o)
    .map((o, i) => ({ o, i }))
    .sort((a, b) => b.o.matches.length - a.o.matches.length || a.i - b.i)
    .map(({ o }) => o);
}

/** The lab's tests as cart items, priced, ready for the normal booking steps. */
export function labCartItems(option: PrescriptionLabOption) {
  const { lab } = option;
  return option.matches.map((m, i) => ({
    id: m.test.id ?? `rx-${i}-${key(m.name).replace(/[^a-z0-9]+/g, "-")}`,
    name: m.name,
    price: m.price,
    labId: lab.id,
    labName: lab.name,
    vendorId: lab.vendor_id ?? undefined,
    kind: "test" as const,
    category: "Prescribed by your doctor",
    availabilityType: m.availabilityType,
    availableDays: m.availableDays,
    sampleType: m.sampleType,
    preparationRequired: m.preparationRequired,
    preparationInstruction: m.preparationInstruction,
    fastingRequired: m.fastingRequired,
    fastingInstruction: m.fastingInstruction,
    reportType: m.reportType,
  }));
}
