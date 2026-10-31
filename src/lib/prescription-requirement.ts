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
}

export interface LiveTestRule {
  availabilityType: TestAvailabilityType;
  availableDays?: string[];
  prescriptionRequired: boolean;
}

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
    };
    [product.name, product.product_name].forEach((name) => {
      if (normalize(name)) rules[normalize(name)] = rule;
    });
  });
  return rules;
}

/** The cart's tests that need a prescription under these rules. */
export const prescriptionTestsFrom = (items: PrescriptionCheckItem[], rules: LiveTestRules | undefined): string[] =>
  items.filter((item) => item.kind !== "package" && rules?.[normalize(item.name)]?.prescriptionRequired).map((item) => item.name);

const sameDays = (a?: string[] | null, b?: string[] | null) => JSON.stringify(a ?? []) === JSON.stringify(b ?? []);

/**
 * Updates the days saved on cart items to match the lab's live rules. Returns the
 * same array when nothing changed, so callers can skip saving.
 */
export function applyLiveRules<T extends PrescriptionCheckItem & { availabilityType?: string; availableDays?: string[] }>(
  items: T[],
  rules: LiveTestRules,
): T[] {
  let changed = false;
  const next = items.map((item) => {
    const rule = item.kind === "package" ? undefined : rules[normalize(item.name)];
    if (!rule) return item;
    if (normalizeAvailabilityType(item.availabilityType) === rule.availabilityType && sameDays(item.availableDays, rule.availableDays)) {
      return item;
    }
    changed = true;
    return { ...item, availabilityType: rule.availabilityType, availableDays: rule.availableDays };
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
    .select("name, product_name, availability_type, available_days, prescription_required")
    .in("vendor_id", ids)
    .eq("availability", true);
  if (error) throw error;
  return rulesFromProducts((data ?? []) as ProductRules[]);
}
