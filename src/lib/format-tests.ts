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
  if (names.length === 1) return names[0];
  
  const othersCount = names.length - 1;
  return `${names[0]} + ${othersCount} more`;
}

/**
 * Split an aggregated `order.test_name` field into clean individual names.
 *
 * Uses `|` (pipe) as the primary delimiter — this avoids conflicts with
 * test names that naturally contain commas (e.g. "Aldosterone, 24-Hour Urine").
 *
 * Falls back to comma splitting only for legacy orders that don't contain pipes.
 */
export function splitTestNames(input: string | null | undefined): string[] {
  const raw = (input || "").trim();
  if (!raw) return [];

  // If the string contains a pipe, split by pipe (new format)
  if (raw.includes("|")) {
    return raw.split("|").map((n) => n.trim()).filter(Boolean);
  }

  // Legacy fallback: treat the entire string as a single test name.
  // Old orders used comma-join, but individual test names can also contain
  // commas (e.g. "Aldosterone, 24-Hour Urine"), so we can't safely split.
  // Returning the whole string as one entry is the safest default.
  return [raw];
}
