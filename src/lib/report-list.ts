export interface ReportListOrder {
  id: string;
  report_url: string | null;
  updated_at: string;
}

export type ReportPeriod = "all" | "3m" | "6m" | "custom";

export const hasReport = (order: Pick<ReportListOrder, "report_url">) => Boolean(order.report_url?.trim());

/** When the report came: the order's last update, which is the lab sending the file. */
export const reportDate = (order: Pick<ReportListOrder, "updated_at">) => {
  const date = new Date(order.updated_at);
  return Number.isNaN(date.getTime()) ? null : date;
};

/** "YYYY-MM-DD" from a date input, read as that day in the phone's own time zone. */
const parseDay = (value: string) => {
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

/**
 * The window a period covers, as [from, to). "Last 3 months" counts back from the
 * start of today; a custom range includes the whole of its last day. A custom
 * range with a missing day stays open on that side.
 */
export const periodRange = (
  period: ReportPeriod,
  custom: { from: string; to: string },
  now = new Date()
): { from: Date | null; to: Date | null } => {
  if (period === "3m" || period === "6m") {
    const from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    from.setMonth(from.getMonth() - (period === "3m" ? 3 : 6));
    return { from, to: null };
  }
  if (period === "custom") {
    let from = custom.from ? parseDay(custom.from) : null;
    let to = custom.to ? parseDay(custom.to) : null;
    if (from && to && from > to) [from, to] = [to, from];
    if (to) to = new Date(to.getFullYear(), to.getMonth(), to.getDate() + 1);
    return { from, to };
  }
  return { from: null, to: null };
};

export const inRange = (order: Pick<ReportListOrder, "updated_at">, range: { from: Date | null; to: Date | null }) => {
  const date = reportDate(order);
  if (!date) return !range.from && !range.to;
  if (range.from && date < range.from) return false;
  if (range.to && date >= range.to) return false;
  return true;
};

/** Orders split into month sections, newest first, e.g. "November 2026". */
export const groupByMonth = <T extends ReportListOrder>(orders: T[]) => {
  const groups: { label: string; orders: T[] }[] = [];
  const sorted = [...orders].sort((a, b) => (reportDate(b)?.getTime() ?? 0) - (reportDate(a)?.getTime() ?? 0));
  for (const order of sorted) {
    const date = reportDate(order);
    const label = date ? date.toLocaleDateString("en-IN", { month: "long", year: "numeric" }) : "Earlier";
    const last = groups[groups.length - 1];
    if (last?.label === label) last.orders.push(order);
    else groups.push({ label, orders: [order] });
  }
  return groups;
};
