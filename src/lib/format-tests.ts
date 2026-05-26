/**
 * Industry-standard "first test + N other(s)" label.
 *
 * Accepts either:
 *   - a comma-separated string (e.g. `"Lipid Profile, CBC, Vitamin D"`)
 *   - an array of test names
 *
 * Returns:
 *   - 0 tests  → `"Lab Test"`
 *   - 1 test   → `"Lipid Profile"`
 *   - 2 tests  → `"Lipid Profile +1 other"`
 *   - 3+ tests → `"Lipid Profile +2 others"`
 */
export function formatTestsLabel(input: string | string[] | null | undefined, fallback = "Lab Test"): string {
  const names = (Array.isArray(input) ? input : (input || "").split(","))
    .map((n) => String(n).trim())
    .filter(Boolean);

  if (names.length === 0) return fallback;
  if (names.length === 1) return names[0];
  const others = names.length - 1;
  return `${names[0]} +${others} ${others === 1 ? "other" : "others"}`;
}

/** Split a comma-aggregated `order.test_name` field into clean names. */
export function splitTestNames(input: string | null | undefined): string[] {
  return (input || "")
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean);
}
