import { simplifyTestName } from "@/utils/simplify-test-name";

/**
 * Industry-standard "first test + N other(s)" label.
 *
 * Accepts either:
 *   - a pipe-separated string  (e.g. `"Lipid Profile | CBC | Vitamin D"`)
 *   - a comma-separated string (legacy, e.g. `"Lipid Profile, CBC"`)
 *   - an array of test names
 *
 * Returns:
 *   - 0 tests  → `"Lab Test"`
 *   - 1 test   → `"Lipid Profile"`
 *   - 2 tests  → `"Lipid Profile +1 other"`
 *   - 3+ tests → `"Lipid Profile +2 others"`
 */
export function formatTestsLabel(input: string | string[] | null | undefined, fallback = "Lab Test"): string {
  const names = Array.isArray(input) ? input.map(n => String(n).trim()).filter(Boolean) : splitTestNames(input);

  if (names.length === 0) return fallback;
  const first = simplifyTestName(names[0]);
  if (names.length === 1) return first;
  
  const othersCount = names.length - 1;
  return `${first} + ${othersCount} more`;
}

/**
 * Split an aggregated `order.test_name` field into clean individual names.
 *
 * New orders (Aug 2026+) use `" | "` (pipe) as the delimiter — this avoids
 * conflicts with test names that naturally contain commas
 * (e.g. "Aldosterone, 24-Hour Urine").
 *
 * Legacy orders used `", "` (comma). For those we fall back to comma splitting.
 */
export function splitTestNames(input: string | null | undefined): string[] {
  const raw = (input || "").trim();
  if (!raw) return [];

  // New format: pipe-separated → split by pipe
  if (raw.includes("|")) {
    return raw.split("|").map((n) => n.trim()).filter(Boolean);
  }

  // Legacy format: comma-separated → split by comma
  return raw.split(",").map((n) => n.trim()).filter(Boolean);
}
