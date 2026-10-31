import { supabase } from "@/integrations/supabase/client";
import { normalizeAvailabilityType, type TestAvailabilityType } from "@/lib/test-availability";

/**
 * A lab's current rules for its tests (Partner portal → products): which days a
 * test runs and whether it needs a doctor's prescription. A cart keeps a copy of
 * a test from when it was added, and labs can change these afterwards, so booking
 * always goes by these live rules. create-order enforces the prescription rule on
 * the server; this is what tells the patient in time.
 */
export interface PrescriptionCheckItem {
  name: string;
  kind?: string;
  vendorId?: string;
  labId?: string;
}

interface ProductRules {
  name?: string | null;
  product_name?: string | null;
  availability_type?: string | null;
  available_days?: string[] | null;
  prescription_required?: boolean | null;
  sample_type?: string | null;
  preparation_required?: boolean | null;
  preparation_instruction?: string | null;
  fasting_required?: boolean | null;
  fasting_instruction?: string | null;
  report_type?: string | null;
  report_time?: string | null;
}

/** The details a cart item keeps a copy of. */
interface LiveTestDetails {
  sampleType?: string;
  preparationRequired?: boolean;
  preparationInstruction?: string;
  fastingRequired?: boolean;
  fastingInstruction?: string;
  reportType?: string;
}

export interface LiveTestRule extends LiveTestDetails {
  availabilityType: TestAvailabilityType;
  availableDays?: string[];
  prescriptionRequired: boolean;
  /** Read live on each visit, so cart items don't keep a copy. */
  reportTime?: string;
}

const DETAIL_KEYS: (keyof LiveTestDetails)[] = [
  "sampleType",
  "preparationRequired",
  "preparationInstruction",
  "fastingRequired",
  "fastingInstruction",
  "reportType",
];

/** Keyed by lower-case test name. A plain object, so the saved query cache can hold it. */
export type LiveTestRules = Record<string, LiveTestRule>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const normalize = (name: string | null | undefined) => (name ?? "").trim().toLowerCase();

export function rulesFromProducts(products: ProductRules[]): LiveTestRules {
  const rules: LiveTestRules = {};
  products.forEach((product) => {
    const availabilityType = normalizeAvailabilityType(product.availability_type);
    const rule: LiveTestRule = {
      availabilityType,
      availableDays: availabilityType === "SPECIALIZED" ? product.available_days ?? undefined : undefined,
      prescriptionRequired: product.prescription_required === true,
      sampleType: product.sample_type || undefined,
      preparationRequired: product.preparation_required === true,
      preparationInstruction: product.preparation_instruction || undefined,
      fastingRequired: product.fasting_required === true,
      fastingInstruction: product.fasting_instruction || undefined,
      reportType: product.report_type || undefined,
      reportTime: product.report_time || undefined,
    };
    [product.name, product.product_name].forEach((name) => {
      if (normalize(name)) rules[normalize(name)] = rule;
    });
  });
  return rules;
}

/** The cart's tests that need a prescription under these rules. */
/** The lab's live rule for a test, if it has one. */
export const liveRuleFor = (rules: LiveTestRules | undefined, name: string) => rules?.[normalize(name)];

export const prescriptionTestsFrom = (items: PrescriptionCheckItem[], rules: LiveTestRules | undefined): string[] =>
  items.filter((item) => item.kind !== "package" && rules?.[normalize(item.name)]?.prescriptionRequired).map((item) => item.name);

const sameDays = (a?: string[] | null, b?: string[] | null) => JSON.stringify(a ?? []) === JSON.stringify(b ?? []);

/**
 * Updates what's saved on cart items to match the lab's live rules. Returns the
 * same array when nothing changed, so callers can skip saving.
 */
export function applyLiveRules<T extends PrescriptionCheckItem & LiveTestDetails & { availabilityType?: string; availableDays?: string[] }>(
  items: T[],
  rules: LiveTestRules,
): T[] {
  let changed = false;
  const next = items.map((item) => {
    const rule = item.kind === "package" ? undefined : rules[normalize(item.name)];
    if (!rule) return item;
    const detailsMatch = DETAIL_KEYS.every((key) => (item[key] || undefined) === (rule[key] || undefined));
    if (detailsMatch && normalizeAvailabilityType(item.availabilityType) === rule.availabilityType && sameDays(item.availableDays, rule.availableDays)) {
      return item;
    }
    changed = true;
    const details = Object.fromEntries(DETAIL_KEYS.map((key) => [key, rule[key]])) as LiveTestDetails;
    return { ...item, ...details, availabilityType: rule.availabilityType, availableDays: rule.availableDays };
  });
  return changed ? next : items;
}

/** The lab's live rules for these tests. Pass vendorId once a lab has been chosen for the whole cart. */
export async function fetchLiveTestRules(items: PrescriptionCheckItem[], vendorId?: string | null): Promise<LiveTestRules> {
  const vendorIds = new Set<string>();
  if (vendorId) vendorIds.add(vendorId);
  else {
    items.forEach((item) => item.vendorId && vendorIds.add(item.vendorId));
    const labIds = items.filter((item) => !item.vendorId && item.labId && UUID.test(item.labId)).map((item) => item.labId!);
    if (labIds.length > 0) {
      const { data } = await supabase.from("diagnostic_centers").select("vendor_id").in("id", labIds);
      (data ?? []).forEach((lab: { vendor_id: string | null }) => lab.vendor_id && vendorIds.add(lab.vendor_id));
    }
  }

  const ids = [...vendorIds].filter((id) => UUID.test(id));
  if (ids.length === 0 || items.length === 0) return {};

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .in("vendor_id", ids)
    .eq("availability", true);
  if (error) throw error;
  return rulesFromProducts((data ?? []) as ProductRules[]);
}
