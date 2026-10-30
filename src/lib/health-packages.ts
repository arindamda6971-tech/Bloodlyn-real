import { supabase } from "@/integrations/supabase/client";

/**
 * Health packages as labs set them up in the Partner portal (synced into
 * test_packages). The category keys match the portal's list
 * (partner-pro src/lib/packageDetails.ts) — keep the two in step.
 */
export const PACKAGE_CATEGORIES = [
  { value: "full_body", label: "Full body" },
  { value: "diabetes", label: "Diabetes" },
  { value: "heart", label: "Heart" },
  { value: "thyroid", label: "Thyroid" },
  { value: "women", label: "Women" },
  { value: "men", label: "Men" },
  { value: "senior", label: "Senior citizen" },
  { value: "vitamins", label: "Vitamins" },
  { value: "fever", label: "Fever & infection" },
  { value: "liver_kidney", label: "Liver & kidney" },
  { value: "other", label: "Other" },
] as const;

const SAMPLE_LABELS: Record<string, string> = {
  blood: "Blood",
  blood_urine: "Blood & urine",
  urine: "Urine",
  other: "Other",
};

export interface IncludedTest {
  name: string;
  category: string | null;
}

export interface HealthPackage {
  id: string;
  name: string;
  description: string | null;
  price: number;
  originalPrice: number | null;
  discountPercent: number;
  testsCount: number;
  isPopular: boolean;
  category: string | null;
  gender: string;
  ageGroup: string;
  fastingHours: number | null;
  reportHours: number | null;
  sampleType: string | null;
  includedTests: IncludedTest[];
  lab: { id: string; name: string; logo: string | null; vendorId: string | null } | null;
}

const num = (v: unknown): number | null => {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
};

/** Turns a test_packages row (with its lab) into a HealthPackage; older rows lack the detail columns. */
export function toHealthPackage(row: any): HealthPackage {
  const lab = row?.diagnostic_centers;
  const price = num(row?.price) ?? 0;
  const original = num(row?.original_price);
  const included = Array.isArray(row?.included_tests)
    ? row.included_tests
        .filter((t: any) => t && typeof t.name === "string" && t.name.trim())
        .map((t: any) => ({ name: t.name.trim(), category: typeof t.category === "string" && t.category.trim() ? t.category.trim() : null }))
    : [];
  const discount = num(row?.discount_percent) ?? (original && original > price ? Math.round(((original - price) / original) * 100) : 0);
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? null,
    price,
    originalPrice: original && original > price ? original : null,
    discountPercent: discount > 0 ? discount : 0,
    testsCount: Math.max(num(row?.tests_count) ?? 0, included.length),
    isPopular: row?.is_popular === true,
    category: typeof row?.category === "string" ? row.category : null,
    gender: typeof row?.gender === "string" ? row.gender : "all",
    ageGroup: typeof row?.age_group === "string" ? row.age_group : "all",
    fastingHours: (num(row?.fasting_hours) ?? 0) > 0 ? num(row.fasting_hours) : null,
    reportHours: (num(row?.report_hours) ?? 0) > 0 ? num(row.report_hours) : null,
    sampleType: typeof row?.sample_type === "string" ? row.sample_type : null,
    includedTests: included,
    lab: lab?.id && lab?.name ? { id: lab.id, name: lab.name, logo: lab.logo_url ?? null, vendorId: lab.vendor_id ?? null } : null,
  };
}

// "*" rather than a column list, so the query keeps working before the
// detail columns exist in the database.
const PACKAGE_SELECT = "*, diagnostic_centers!diagnostic_center_id ( id, name, logo_url, vendor_id )";

/** Active packages from labs that exist, popular first. */
export async function fetchActivePackages(): Promise<HealthPackage[]> {
  const { data, error } = await supabase
    .from("test_packages")
    .select(PACKAGE_SELECT)
    .eq("is_active", true)
    .order("is_popular", { ascending: false })
    .order("price", { ascending: true });
  if (error) throw error;
  return ((data as any[]) || []).map(toHealthPackage).filter((p) => p.lab);
}

export async function fetchPackage(id: string): Promise<HealthPackage | null> {
  const { data, error } = await supabase.from("test_packages").select(PACKAGE_SELECT).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? toHealthPackage(data) : null;
}

export const ACTIVE_PACKAGES_QUERY_KEY = ["active-health-packages"] as const;

export const categoryLabel = (value: string | null) =>
  PACKAGE_CATEGORIES.find((c) => c.value === value)?.label ?? null;

/** Categories that have at least one package, in the standard order. */
export function categoriesWithPackages(packages: HealthPackage[]) {
  const present = new Set(packages.map((p) => p.category));
  return PACKAGE_CATEGORIES.filter((c) => present.has(c.value));
}

export function formatHours(hours: number): string {
  if (hours < 24) return `${hours} h`;
  const days = Math.round(hours / 24);
  return days === 1 ? "24 h" : `${days} days`;
}

export const fastingText = (p: HealthPackage) =>
  p.fastingHours ? `Fasting ${p.fastingHours} h` : "No fasting";

export const reportText = (p: HealthPackage) =>
  p.reportHours ? `Reports in ${formatHours(p.reportHours)}` : null;

export const sampleText = (p: HealthPackage) => (p.sampleType ? SAMPLE_LABELS[p.sampleType] ?? null : null);

/** "Men · Adults (18+)" style line, or null when it's for everyone. */
export function audienceText(p: HealthPackage): string | null {
  const gender = p.gender === "male" ? "Men" : p.gender === "female" ? "Women" : null;
  const age =
    p.ageGroup === "adult" ? "Adults (18+)" : p.ageGroup === "senior" ? "Seniors (60+)" : p.ageGroup === "child" ? "Children" : null;
  const parts = [gender, age].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

/** Included tests grouped by their category, largest group first. */
export function groupIncludedTests(tests: IncludedTest[]): { group: string; tests: string[] }[] {
  const map = new Map<string, string[]>();
  tests.forEach((t) => {
    const key = t.category || "Other tests";
    map.set(key, [...(map.get(key) || []), t.name]);
  });
  return [...map.entries()]
    .map(([group, names]) => ({ group, tests: names.sort((a, b) => a.localeCompare(b)) }))
    .sort((a, b) => b.tests.length - a.tests.length || a.group.localeCompare(b.group));
}

/** A short "CBC, Lipid, Thyroid +4" preview of what's inside. */
export function includedPreview(p: HealthPackage, max = 3): string | null {
  if (p.includedTests.length === 0) return null;
  const names = p.includedTests.slice(0, max).map((t) => t.name);
  const more = p.includedTests.length - names.length;
  return more > 0 ? `${names.join(", ")} +${more}` : names.join(", ");
}

export type PackageSort = "popular" | "price_low" | "price_high" | "most_tests";

export function sortPackages(list: HealthPackage[], sort: PackageSort): HealthPackage[] {
  const out = [...list];
  if (sort === "price_low") out.sort((a, b) => a.price - b.price);
  else if (sort === "price_high") out.sort((a, b) => b.price - a.price);
  else if (sort === "most_tests") out.sort((a, b) => b.testsCount - a.testsCount);
  else out.sort((a, b) => Number(b.isPopular) - Number(a.isPopular) || b.discountPercent - a.discountPercent);
  return out;
}
