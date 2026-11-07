/** Display helpers shared by the order-processing and order-placed screens. */

const parseDay = (value?: string | null): Date | null => {
  if (!value) return null;
  const d = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** "2026-11-07" → "Sat, 7 Nov" */
export const formatPassDate = (value?: string | null): string | null => {
  const d = parseDay(value);
  if (!d) return value ? String(value) : null;
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
};

/** "today" | "tomorrow" | "on Saturday" | "on Sat, 14 Nov" (relative to `now`). */
export const relativeDayPhrase = (value?: string | null, now: Date = new Date()): string | null => {
  const d = parseDay(value);
  if (!d) return null;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((d.getTime() - today.getTime()) / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days > 1 && days < 7) return `on ${d.toLocaleDateString("en-IN", { weekday: "long" })}`;
  return `on ${formatPassDate(value)}`;
};

/**
 * "Afternoon (2 PM - 4 PM)" → "2 – 4 PM"; "Morning (10 AM - 12 PM)" → "10 AM – 12 PM".
 * Falls back to the original text when it isn't a recognisable window.
 */
export const formatTimeWindow = (value?: string | null): string | null => {
  if (!value) return null;
  const text = String(value);
  const m = text.match(/(\d{1,2}(?::\d{2})?)\s*(AM|PM)\s*[-–]\s*(\d{1,2}(?::\d{2})?)\s*(AM|PM)/i);
  if (!m) return text.replace(/^.*\((.*)\).*$/, "$1").replace(/\s*-\s*/, " – ");
  const [, from, fromMer, to, toMer] = m;
  return fromMer.toUpperCase() === toMer.toUpperCase()
    ? `${from} – ${to} ${toMer.toUpperCase()}`
    : `${from} ${fromMer.toUpperCase()} – ${to} ${toMer.toUpperCase()}`;
};

export const formatINR = (n: number) => `₹${n.toLocaleString("en-IN")}`;

/**
 * "Blood · Fasting required" from the Partner test metadata carried on cart items.
 * Fasting is only mentioned when the lab marked it as required.
 */
export const testSampleLine = (item: { sampleType?: string | null; fastingRequired?: boolean | null; fastingInstruction?: string | null }) => {
  const parts: string[] = [];
  const sample = item.sampleType?.trim();
  if (sample) parts.push(sample.charAt(0).toUpperCase() + sample.slice(1));
  if (item.fastingRequired) parts.push(item.fastingInstruction?.trim() || "Fasting required");
  return parts.length ? parts.join(" · ") : null;
};
