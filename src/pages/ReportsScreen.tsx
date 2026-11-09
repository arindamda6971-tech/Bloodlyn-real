import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileText, Loader2, Calendar, ChevronDown, Building2, CreditCard, Hash, User, FlaskConical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { downloadReport } from "@/lib/download-report";
import { groupByMonth, hasReport, inRange, periodRange, reportDate, type ReportPeriod } from "@/lib/report-list";

import MobileLayout from "@/components/layout/MobileLayout";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useSEO } from "@/hooks/useSEO";
import { Skeleton } from "@/components/ui/skeleton";
import StickySearch from "@/components/ui/StickySearch";
import PremiumPageHeader from "@/components/layout/PremiumPageHeader";
import { formatTestsLabel, splitTestNames } from "@/lib/format-tests";
import { simplifyTestName } from "@/utils/simplify-test-name";
import { subscribeUserLive } from "@/lib/userLive";

interface ReportOrder {
  id: string;
  test_name: string | null;
  report_url: string | null;
  status: string | null;
  lab_name: string | null;
  updated_at: string;
  order_number: string | null;
  scheduled_date: string | null;
  scheduled_time_slot?: string | null;
  total?: number;
  payment_method?: string | null;
  family_member_id?: string | null;
  family_members?: { full_name: string } | null;
}

const PERIODS: { key: ReportPeriod; label: string }[] = [
  { key: "all", label: "All" },
  { key: "3m", label: "3 months" },
  { key: "6m", label: "6 months" },
  { key: "custom", label: "Custom" },
];

const shortDate = (date: Date | null) =>
  date ? date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : null;

/** Today as "YYYY-MM-DD" in the phone's time zone, the latest day a date box offers. */
const todayInput = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const ReportsScreen = () => {
  useSEO({ title: "My Reports | BloodLyn", description: "Your lab test reports in one place, ready to download." });
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [period, setPeriod] = useState<ReportPeriod>("all");
  const [custom, setCustom] = useState({ from: "", to: "" });
  const [patient, setPatient] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const { data: orders = [], isLoading: loading } = useQuery({
    queryKey: ["reports", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("orders")
        .select("id, test_name, report_url, status, lab_name, updated_at, order_number, scheduled_date, scheduled_time_slot, total, payment_method, family_member_id, special_instructions")
        .eq("user_id", user.id)
        .in("status", ["report_ready", "report_delivered", "completed"])
        .not("report_url", "is", null)
        .order("updated_at", { ascending: false });

      if (error) {
        console.error("Reports fetch error:", error);
        return [];
      }

      const { data: familyMembers } = await supabase
        .from("family_members")
        .select("id, full_name")
        .eq("user_id", user.id);

      const membersMap = new Map((familyMembers || []).map(m => [m.id, m.full_name]));

      const parsePatientName = (instructions?: string | null): string | null => {
        if (!instructions) return null;
        const m = instructions.match(/Patient:\s*([^(]+?)\s*\(/);
        return m ? m[1].trim() : null;
      };

      return (data || []).map((o: any) => {
        const memberName = o.family_member_id && membersMap.has(o.family_member_id)
          ? membersMap.get(o.family_member_id)
          : parsePatientName(o.special_instructions);
        return {
          ...o,
          family_members: memberName ? { full_name: memberName } : null,
        };
      }) as ReportOrder[];
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (!user) return;
    return subscribeUserLive("orders", user.id, () => {
      queryClient.invalidateQueries({ queryKey: ["reports", user.id] });
    });
  }, [user, queryClient]);

  const selfName = (user?.user_metadata?.full_name as string | undefined)?.trim() || "You";
  const patientOf = (order: ReportOrder) => order.family_members?.full_name?.trim() || selfName;

  // Only reports the lab has sent; orders still being tested are on My Bookings.
  const reports = useMemo(() => orders.filter(hasReport), [orders]);
  const patients = useMemo(() => [...new Set(reports.map(patientOf))], [reports, selfName]); // eslint-disable-line react-hooks/exhaustive-deps

  // A patient chip from an earlier list (e.g. after a refresh) that no longer has reports.
  const activePatient = patient && patients.includes(patient) ? patient : null;

  const forPatient = useMemo(
    () => (activePatient ? reports.filter((o) => patientOf(o) === activePatient) : reports),
    [reports, activePatient, selfName] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const groups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const range = periodRange(period, custom);
    const shown = forPatient.filter((order) => {
      if (!inRange(order, range)) return false;
      if (!q) return true;
      return (
        order.test_name?.toLowerCase().includes(q) ||
        order.lab_name?.toLowerCase().includes(q) ||
        patientOf(order).toLowerCase().includes(q) ||
        order.order_number?.toLowerCase().includes(q)
      );
    });
    return groupByMonth(shown);
  }, [forPatient, period, custom, searchQuery, selfName]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDownload = async (order: ReportOrder) => {
    if (!order.report_url || downloadingId) return;
    setDownloadingId(order.id);
    try {
      const base = `report-${order.order_number || order.id.slice(0, 8)}`;
      const result = await downloadReport(order.report_url, base, order.id);
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
    } finally {
      setDownloadingId(null);
    }
  };

  const emptyTitle = searchQuery.trim()
    ? "No matching reports"
    : reports.length === 0
      ? "No reports yet"
      : "No reports in these dates";
  const emptyText = searchQuery.trim()
    ? `Nothing matches "${searchQuery.trim()}". Try a test, lab or patient name.`
    : reports.length === 0
      ? "Book a test and your report will appear here as soon as the lab sends it."
      : "Try a longer period to see your older reports.";

  return (
    <MobileLayout>
      {/* Page Header - Scrolls away naturally like Home screen */}
      <div className="px-5 pt-3 pb-1">
        <PremiumPageHeader title="My Reports" subtitle="Your lab reports in one place" icon={FileText} />
      </div>

      {/* Sticky Search Input Bar - Pins at top-0 */}
      <StickySearch
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search by test, lab or patient"
        accent="from-violet-500 via-fuchsia-500 to-primary"
      />

      <div className="px-4 pb-8 mt-3">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-11 w-full rounded-full" />
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-[22px] border border-slate-200/80 bg-white p-4 space-y-3">
                <div className="flex gap-3">
                  <Skeleton className="w-11 h-11 rounded-2xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="w-3/4 h-4" />
                    <Skeleton className="w-1/2 h-3" />
                  </div>
                </div>
                <Skeleton className="w-full h-9 rounded-xl" />
                <Skeleton className="w-full h-10 rounded-full" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {reports.length > 0 && (
              <div className="space-y-2.5 mb-4">
                {/* Date period: all four fit on a 360px phone */}
                <div className="grid grid-cols-4 gap-1.5" role="group" aria-label="Report dates">
                  {PERIODS.map((p) => {
                    const active = period === p.key;
                    return (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() => setPeriod(p.key)}
                        aria-pressed={active}
                        className={`flex min-w-0 items-center justify-center gap-1 rounded-full border px-1 py-2 text-[12.5px] font-semibold transition-colors ${
                          active ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600"
                        }`}
                      >
                        <span className="truncate">{p.label}</span>
                      </button>
                    );
                  })}
                </div>

                {period === "custom" && (
                  <div className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-200/80 bg-white p-3">
                    {(["from", "to"] as const).map((side) => (
                      <label key={side} className="min-w-0">
                        <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                          {side === "from" ? "From" : "To"}
                        </span>
                        <input
                          type="date"
                          value={custom[side]}
                          max={todayInput()}
                          min={side === "to" ? custom.from || undefined : undefined}
                          onChange={(e) => setCustom((c) => ({ ...c, [side]: e.target.value }))}
                          className="h-10 w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-[13px] font-medium text-slate-800 outline-none focus:border-slate-400"
                        />
                      </label>
                    ))}
                  </div>
                )}

                {/* Patients, only when the reports are for more than one person */}
                {patients.length > 1 && (
                  <div className="-mx-4 flex gap-2 overflow-x-auto px-4 hide-scrollbar">
                    {[null, ...patients].map((name) => {
                      const active = activePatient === name;
                      return (
                        <button
                          key={name ?? "everyone"}
                          type="button"
                          onClick={() => setPatient(name)}
                          aria-pressed={active}
                          className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12px] font-semibold transition-colors ${
                            active ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600"
                          }`}
                        >
                          {name ? <User className="h-3 w-3" /> : null}
                          <span className="max-w-[120px] truncate">{name ?? "Everyone"}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {groups.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-[24px] border border-dashed border-slate-200 bg-white px-6 py-14 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-[20px] bg-primary/10">
                  <FileText className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-[16px] font-bold text-slate-900">{emptyTitle}</h3>
                <p className="mt-1.5 max-w-[270px] text-[13px] leading-relaxed text-slate-500">{emptyText}</p>
                {reports.length === 0 && !searchQuery.trim() && (
                  <Button onClick={() => navigate("/categories")} className="mt-5 h-10 rounded-full bg-slate-900 px-6 text-[13px] font-bold text-white hover:bg-black">
                    Book a test
                  </Button>
                )}
                {reports.length > 0 && period !== "all" && (
                  <Button onClick={() => setPeriod("all")} variant="outline" className="mt-5 h-10 rounded-full px-6 text-[13px] font-bold">
                    Show all time
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-5 list-virtual-lg">
                {groups.map((group) => (
                  <section key={group.label}>
                    <h2 className="mb-2 px-1 text-[12px] font-bold uppercase tracking-[0.08em] text-slate-400">{group.label}</h2>
                    <div className="space-y-3">
                      {group.orders.map((order) => {
                        const names = splitTestNames(order.test_name);
                        const label = formatTestsLabel(names, "Health Test");
                        const expanded = expandedId === order.id;
                        const downloading = downloadingId === order.id;
                        const date = shortDate(reportDate(order));
                        const testDay = order.scheduled_date ? shortDate(new Date(order.scheduled_date)) : null;
                        const total = Number(order.total || 0);

                        return (
                          <article
                            key={order.id}
                            className="rounded-[22px] border border-slate-200/80 bg-white p-4 shadow-[0_6px_18px_-12px_rgba(15,23,42,0.22)]"
                          >
                            <div className="flex gap-3">
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                                <FileText className="h-5 w-5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <h3 className="line-clamp-2 break-words text-[15px] font-bold leading-snug text-slate-900">{label}</h3>
                                <p className="mt-1 truncate text-[12px] text-slate-500">
                                  <span className="font-semibold text-slate-700">{patientOf(order)}</span>
                                  {order.lab_name && <> · {order.lab_name}</>}
                                </p>
                              </div>
                            </div>

                            <div className="mt-3 flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-[12px] text-slate-600">
                              <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                              <span className="min-w-0 flex-1 truncate">
                                Report on {date && <span className="font-semibold text-slate-800">{date}</span>}
                              </span>
                              {names.length > 1 && (
                                <span className="shrink-0 font-semibold text-slate-500">{names.length} tests</span>
                              )}
                            </div>

                            <div className="mt-3 flex items-center justify-between gap-2">
                              <Button
                                onClick={() => handleDownload(order)}
                                disabled={downloading}
                                className="h-9 gap-1.5 rounded-full bg-slate-900 px-4 text-[12.5px] font-semibold text-white shadow-none hover:bg-black"
                              >
                                {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                                {downloading ? "Saving..." : "Download"}
                              </Button>
                              <button
                                type="button"
                                onClick={() => setExpandedId(expanded ? null : order.id)}
                                aria-expanded={expanded}
                                className="flex h-9 shrink-0 items-center gap-1 rounded-full px-2 text-[12.5px] font-semibold text-slate-500 active:scale-95 transition-transform"
                              >
                                Details
                                <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
                              </button>
                            </div>

                            {expanded && (
                              <div className="mt-4 border-t border-slate-100 pt-4">
                                <div className="mb-2 flex items-center gap-2">
                                  <FlaskConical className="h-4 w-4 text-primary" />
                                  <h4 className="text-[13px] font-bold text-slate-900">
                                    {names.length} {names.length === 1 ? "test" : "tests"}
                                  </h4>
                                </div>
                                <ol className="mb-3 divide-y divide-slate-100 rounded-2xl bg-slate-50 px-3">
                                  {names.map((name, idx) => (
                                    <li key={idx} className="flex items-start gap-2.5 py-2">
                                      <span className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-[10px] font-bold text-slate-500 ring-1 ring-slate-200">
                                        {idx + 1}
                                      </span>
                                      <span className="min-w-0 break-words text-[12.5px] font-medium leading-snug text-slate-800">
                                        {simplifyTestName(name)}
                                      </span>
                                    </li>
                                  ))}
                                </ol>

                                <dl className="divide-y divide-slate-100 rounded-2xl border border-slate-100 px-3 text-[12px]">
                                  {order.order_number && (
                                    <div className="flex items-center justify-between gap-3 py-2">
                                      <dt className="flex items-center gap-2 text-slate-500"><Hash className="h-3.5 w-3.5" /> Order</dt>
                                      <dd className="truncate font-mono font-semibold text-slate-800">{order.order_number}</dd>
                                    </div>
                                  )}
                                  {order.lab_name && (
                                    <div className="flex items-center justify-between gap-3 py-2">
                                      <dt className="flex items-center gap-2 text-slate-500"><Building2 className="h-3.5 w-3.5" /> Lab</dt>
                                      <dd className="truncate text-right font-semibold text-slate-800">{order.lab_name}</dd>
                                    </div>
                                  )}
                                  {testDay && (
                                    <div className="flex items-center justify-between gap-3 py-2">
                                      <dt className="flex items-center gap-2 text-slate-500"><Calendar className="h-3.5 w-3.5" /> Test day</dt>
                                      <dd className="truncate text-right font-semibold text-slate-800">
                                        {testDay}
                                        {order.scheduled_time_slot ? ` · ${order.scheduled_time_slot}` : ""}
                                      </dd>
                                    </div>
                                  )}
                                  {order.payment_method && (
                                    <div className="flex items-center justify-between gap-3 py-2">
                                      <dt className="flex items-center gap-2 text-slate-500"><CreditCard className="h-3.5 w-3.5" /> Payment</dt>
                                      <dd className="truncate text-right font-semibold capitalize text-slate-800">
                                        {order.payment_method.replace(/_/g, " ").replace(/\bupi\b/gi, "UPI")}
                                      </dd>
                                    </div>
                                  )}
                                  {total > 0 && (
                                    <div className="flex items-center justify-between gap-3 py-2">
                                      <dt className="text-slate-500">Total</dt>
                                      <dd className="text-[14px] font-black tabular-nums text-slate-900">₹{total.toLocaleString("en-IN")}</dd>
                                    </div>
                                  )}
                                </dl>
                              </div>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </MobileLayout>
  );
};

export default ReportsScreen;
