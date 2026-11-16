import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Building2, CalendarCheck, FileText, MonitorSmartphone, RefreshCw, Search, SlidersHorizontal, Stethoscope, Video, Wallet, X } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import { Button } from "@/components/ui/button";
import { DoctorListCard } from "@/components/doctors/DoctorListCard";
import { DoctorFilterSheet } from "@/components/doctors/DoctorFilterSheet";
import { useDoctors } from "@/hooks/useDoctors";
import { useSEO } from "@/hooks/useSEO";
import {
  PROBLEMS,
  defaultType,
  findDoctors,
  problemByKey,
  specialtiesWithDoctors,
  specialtyByKey,
  type ConsultMode,
  type DoctorSort,
} from "@/lib/doctor-finder";
import type { Doctor } from "@/types/consultation";
import type { BookDoctorState } from "@/pages/BookDoctorScreen";

const SORT_LABEL: Record<DoctorSort, string> = { recommended: "Recommended", fee: "Lowest fee", experience: "Most experienced" };


/**
 * Consult a doctor: every doctor accepting consultations, with search, an online / clinic
 * switch, specialty chips, a filter in the corner, and everyday problems that lead to the
 * right specialty. What the patient chose lives in the address, so Back from a doctor's
 * page comes back to the same list.
 */
const DoctorConsultScreen = () => {
  useSEO({ title: "Consult a doctor | BloodLyn", description: "Book a verified doctor for an online consultation or a clinic visit." });
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { data: doctors = [], isLoading, isError, refetch, isFetching } = useDoctors();
  const [filterOpen, setFilterOpen] = useState(false);

  const mode: ConsultMode = params.get("mode") === "clinic" ? "clinic" : "online";
  const specialty = specialtyByKey(params.get("specialty"))?.key ?? null;
  const problem = problemByKey(params.get("problem"))?.key ?? null;
  const sort = (["fee", "experience"].includes(params.get("sort") ?? "") ? params.get("sort") : "recommended") as DoctorSort;
  const search = params.get("q") ?? "";

  const set = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    setParams(next, { replace: true });
  };

  const available = useMemo(() => specialtiesWithDoctors(doctors, mode), [doctors, mode]);
  const counts = useMemo(() => Object.fromEntries(available.map((s) => [s.key, s.count])), [available]);
  const results = useMemo(() => findDoctors(doctors, { mode, specialty, problem, search, sort }), [doctors, mode, specialty, problem, search, sort]);
  // The chips show the specialties with doctors, plus the chosen one even if it has none.
  const chips = specialty && !counts[specialty] ? [...available, { ...specialtyByKey(specialty)!, count: 0 }] : available;
  const filtered = !!(specialty || problem || search || sort !== "recommended");
  const chosenProblem = problemByKey(problem);

  const query = () => {
    const keep = new URLSearchParams();
    keep.set("mode", mode);
    if (problem) keep.set("problem", problem);
    return keep.toString();
  };
  const book = (doctor: Doctor) => {
    const state: BookDoctorState = { doctor, type: defaultType(doctor, mode), symptoms: chosenProblem?.label ?? "" };
    navigate("/book-doctor", { state });
  };

  return (
    <MobileLayout showNav={false}>
      <div className="sticky top-0 z-40 border-b border-border/40 bg-background/95 pb-3 backdrop-blur">
        <div className="flex items-center gap-2 px-4 pt-3">
          <button type="button" onClick={() => navigate(-1)} aria-label="Back" className="-ml-1 flex h-10 w-10 items-center justify-center rounded-full active:bg-muted">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <h1 className="flex-1 text-[17px] font-black tracking-tight text-foreground">Consult a doctor</h1>
          <button
            type="button"
            onClick={() => setFilterOpen(true)}
            aria-label="Filter doctors"
            className={`relative flex h-10 items-center gap-1.5 rounded-full border px-3.5 text-xs font-bold transition-colors ${
              specialty || sort !== "recommended" ? "border-primary bg-primary/10 text-primary" : "border-border/70 text-foreground"
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" /> Filter
            {(specialty || sort !== "recommended") && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-primary" />}
          </button>
        </div>

        <div className="mt-2.5 px-4">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => set({ q: e.target.value.slice(0, 60) || null })}
              placeholder="Search doctor, specialty or clinic"
              className="h-11 w-full rounded-2xl border border-border/70 bg-muted/40 pl-10 pr-10 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/50 focus:bg-background"
            />
            {search && (
              <button type="button" aria-label="Clear search" onClick={() => set({ q: null })} className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground active:bg-muted">
                <X className="h-4 w-4" />
              </button>
            )}
          </label>

          <div className="mt-2.5 grid grid-cols-2 gap-1 rounded-2xl bg-muted/60 p-1" role="tablist" aria-label="How to consult">
            {([
              { key: "online", label: "Online consult", icon: MonitorSmartphone },
              { key: "clinic", label: "Clinic visit", icon: Building2 },
            ] as const).map((m) => (
              <button
                key={m.key}
                type="button"
                role="tab"
                aria-selected={mode === m.key}
                onClick={() => set({ mode: m.key === "online" ? null : m.key, specialty: null })}
                className={`flex h-10 items-center justify-center gap-1.5 rounded-xl text-[13px] font-bold transition-colors ${
                  mode === m.key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                <m.icon className="h-4 w-4" /> {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="pb-[calc(var(--sab)+32px)]">
        {!filtered && (
          <section className="relative mx-4 mt-4 overflow-hidden rounded-3xl bg-gradient-to-br from-sky-600 to-blue-700 px-4 pb-4 pt-4 text-white shadow-lg shadow-blue-600/20">
            <span aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-white/10" />
            <div className="relative flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-white/70">How it works</p>
                <p className="mt-0.5 text-base font-black leading-snug">
                  {mode === "online" ? "See a doctor from home, today" : "Book a visit to a doctor's clinic"}
                </p>
              </div>
              <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-blue-700">
                <Wallet className="h-3.5 w-3.5" /> {mode === "online" ? "Pay after" : "Pay at clinic"}
              </span>
            </div>
            <ol className="relative mt-4 grid grid-cols-3">
              {(mode === "online"
                ? [
                    { icon: Stethoscope, text: "Pick a doctor" },
                    { icon: Video, text: "Talk on Google Meet" },
                    { icon: FileText, text: "Get your prescription" },
                  ]
                : [
                    { icon: Stethoscope, text: "Pick a doctor" },
                    { icon: CalendarCheck, text: "Choose your day" },
                    { icon: Building2, text: "Visit the clinic" },
                  ]
              ).map((s, i) => (
                <li key={s.text} className="relative flex flex-col items-center text-center">
                  {i > 0 && <span aria-hidden className="absolute right-1/2 top-5 w-full -translate-x-5 border-t-2 border-dashed border-white/40" />}
                  <span className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white text-blue-700 shadow-md shadow-blue-900/20">
                    <s.icon className="h-[18px] w-[18px]" />
                  </span>
                  <p className="mt-2 max-w-[7.5rem] px-1 text-[11px] font-bold leading-tight text-white">{s.text}</p>
                </li>
              ))}
            </ol>
          </section>
        )}

        <section className="mt-5">
          <h2 className="px-4 text-sm font-black text-foreground">What's bothering you?</h2>
          <div className="mt-2.5 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none">
            {PROBLEMS.map((p) => {
              const active = problem === p.key;
              return (
                <button
                  key={p.key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => set({ problem: active ? null : p.key, specialty: null })}
                  className={`shrink-0 rounded-full border px-3.5 py-2 text-[13px] font-semibold transition-colors ${
                    active ? "border-primary bg-primary text-primary-foreground" : "border-border/70 bg-card text-foreground"
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </section>

        {chips.length > 0 && (
          <section className="mt-4">
            <h2 className="px-4 text-sm font-black text-foreground">Specialties</h2>
            <div className="mt-2.5 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none">
              <button
                type="button"
                aria-pressed={!specialty}
                onClick={() => set({ specialty: null })}
                className={`shrink-0 rounded-2xl border px-3.5 py-2 text-[13px] font-bold ${!specialty ? "border-foreground bg-foreground text-background" : "border-border/70 bg-card text-foreground"}`}
              >
                All
              </button>
              {chips.map((s) => {
                const active = specialty === s.key;
                return (
                  <button
                    key={s.key}
                    type="button"
                    aria-pressed={active}
                    onClick={() => set({ specialty: active ? null : s.key, problem: null })}
                    className={`shrink-0 rounded-2xl border px-3.5 py-2 text-[13px] font-bold ${active ? "border-foreground bg-foreground text-background" : "border-border/70 bg-card text-foreground"}`}
                  >
                    {s.label} <span className={active ? "text-background/70" : "text-muted-foreground"}>{s.count}</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        <section className="mt-5 px-4">
          {isLoading ? (
            <div className="space-y-3" role="status" aria-label="Finding doctors">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-44 animate-pulse rounded-3xl border border-border/50 bg-muted/40" />
              ))}
            </div>
          ) : isError ? (
            <div className="rounded-3xl border border-border/60 bg-card px-6 py-10 text-center">
              <p className="font-bold text-foreground">Couldn't load doctors</p>
              <p className="mt-1 text-sm text-muted-foreground">Check your connection and try again.</p>
              <Button variant="outline" className="mt-4 rounded-2xl" onClick={() => refetch()} disabled={isFetching}>
                <RefreshCw className={`mr-1.5 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} /> Try again
              </Button>
            </div>
          ) : (
            <>
              <div className="mb-3 flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-base font-black text-foreground">
                    {results.doctors.length} {results.doctors.length === 1 ? "doctor" : "doctors"}
                    {specialty ? ` · ${specialtyByKey(specialty)!.label}` : chosenProblem ? ` for ${chosenProblem.label.toLowerCase()}` : ""}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {mode === "online" ? "Accepting online consultations" : "Taking clinic visits"} · {SORT_LABEL[sort]}
                  </p>
                </div>
                {filtered && (
                  <button type="button" onClick={() => set({ specialty: null, problem: null, q: null, sort: null })} className="shrink-0 text-xs font-bold text-primary">
                    Clear all
                  </button>
                )}
              </div>

              {results.fallbackFrom && results.doctors.length > 0 && (
                <p className="mb-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-3.5 py-2.5 text-xs font-semibold leading-snug text-amber-800 dark:text-amber-300">
                  No {results.fallbackFrom.label.toLowerCase()} doctor is on BloodLyn yet. These doctors can help with {chosenProblem?.label.toLowerCase()}.
                </p>
              )}

              {results.doctors.length > 0 ? (
                <div className="space-y-3">
                  {results.doctors.map((d) => (
                    <DoctorListCard
                      key={d.id}
                      doctor={d}
                      mode={mode}
                      onOpen={() => navigate(`/doctor/${d.id}?${query()}`)}
                      onBook={() => book(d)}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-3xl border border-border/60 bg-card px-6 py-10 text-center">
                  <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                    <Stethoscope className="h-6 w-6" />
                  </span>
                  <p className="mt-3 font-bold text-foreground">
                    {doctors.length === 0 ? "No doctor is accepting consultations right now" : "No doctor matches"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {doctors.length === 0
                      ? "Doctors appear here as soon as they start taking bookings. Please check again soon."
                      : mode === "clinic"
                        ? "Try an online consultation, or clear the filters."
                        : "Try another specialty, or clear the filters."}
                  </p>
                  {doctors.length > 0 && (
                    <Button
                      variant="outline"
                      className="mt-4 rounded-2xl"
                      onClick={() => set({ specialty: null, problem: null, q: null, sort: null, mode: mode === "clinic" && !filtered ? null : params.get("mode") })}
                    >
                      {mode === "clinic" && !filtered ? "See online doctors" : "Clear filters"}
                    </Button>
                  )}
                </div>
              )}
            </>
          )}
        </section>

        <p className="mt-6 px-6 text-center text-[11px] leading-relaxed text-muted-foreground">
          Every doctor on BloodLyn is registered with a medical council and checked by us. For an emergency, call 112 or go to the nearest hospital.
        </p>
      </div>

      <DoctorFilterSheet
        open={filterOpen}
        onOpenChange={setFilterOpen}
        specialty={specialty}
        sort={sort}
        counts={counts}
        onApply={(s, so) => {
          set({ specialty: s, sort: so === "recommended" ? null : so, problem: s ? null : problem });
          setFilterOpen(false);
        }}
      />
    </MobileLayout>
  );
};

export default DoctorConsultScreen;
