import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ChevronDown, FileText, RefreshCw, Search, Stethoscope, Video, Wallet, X } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import { Button } from "@/components/ui/button";
import { DoctorListCard } from "@/components/doctors/DoctorListCard";
import { specialtyIcon } from "@/components/doctors/specialtyIcons";
import { useDoctors } from "@/hooks/useDoctors";
import { useSEO } from "@/hooks/useSEO";
import { SPECIALTIES, defaultType, doctorCounts, findDoctors, specialtyByKey, specialtyOf, type DoctorSort } from "@/lib/doctor-finder";
import type { Doctor } from "@/types/consultation";
import type { BookDoctorState } from "@/pages/BookDoctorScreen";

const SORTS: Array<{ key: DoctorSort; label: string }> = [
  { key: "recommended", label: "Recommended" },
  { key: "fee", label: "Lowest fee" },
  { key: "experience", label: "Most experienced" },
];

/** How many specialty tiles show before "See all". */
const FIRST_TILES = 9;

/**
 * Consult a doctor online: pick a specialty and the doctors in it are listed; search and
 * sort help too. The patient tells the doctor what's wrong when booking and on the call.
 * What the patient chose lives in the address, so Back from a doctor's page comes back
 * to the same list.
 */
const DoctorConsultScreen = () => {
  useSEO({ title: "Consult a doctor | BloodLyn", description: "Consult a verified doctor online on video or audio." });
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { data: doctors = [], isLoading, isError, refetch, isFetching } = useDoctors();

  const specialty = specialtyByKey(params.get("specialty"));
  const sort = (SORTS.some((s) => s.key === params.get("sort")) ? params.get("sort") : "recommended") as DoctorSort;
  const search = params.get("q") ?? "";
  const [showAll, setShowAll] = useState(() => SPECIALTIES.findIndex((s) => s.key === specialty?.key) >= FIRST_TILES);

  const set = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    setParams(next, { replace: true });
  };

  const counts = useMemo(() => doctorCounts(doctors), [doctors]);
  const results = useMemo(() => findDoctors(doctors, { specialty: specialty?.key, search, sort }), [doctors, specialty, search, sort]);
  const tiles = showAll ? SPECIALTIES : SPECIALTIES.slice(0, FIRST_TILES);
  const general = SPECIALTIES[0];

  const book = (doctor: Doctor) => {
    const state: BookDoctorState = { doctor, type: defaultType(doctor), specialty: specialty?.key ?? specialtyOf(doctor)?.key ?? null };
    navigate("/book-doctor", { state });
  };
  const openDoctor = (doctor: Doctor) => navigate(`/doctor/${doctor.id}${specialty ? `?specialty=${specialty.key}` : ""}`);

  return (
    <MobileLayout showNav={false}>
      <div className="sticky top-0 z-40 border-b border-border/40 bg-background/95 pb-3 backdrop-blur">
        <div className="flex items-center gap-2 px-4 pt-3">
          <button type="button" onClick={() => navigate(-1)} aria-label="Back" className="-ml-1 flex h-10 w-10 items-center justify-center rounded-full active:bg-muted">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <h1 className="flex-1 text-[17px] font-black tracking-tight text-foreground">Consult a doctor</h1>
        </div>
        <div className="mt-2 px-4">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => set({ q: e.target.value.slice(0, 60) || null })}
              placeholder="Search doctor or specialty"
              className="h-11 w-full rounded-2xl border border-border/70 bg-muted/40 pl-10 pr-10 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/50 focus:bg-background"
            />
            {search && (
              <button type="button" aria-label="Clear search" onClick={() => set({ q: null })} className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground active:bg-muted">
                <X className="h-4 w-4" />
              </button>
            )}
          </label>
        </div>
      </div>

      <div className="pb-[calc(var(--sab)+32px)]">
        {/* Stays when a specialty is picked, so the tiles don't jump under the finger. */}
        {!search && (
          <section className="relative mx-4 mt-4 overflow-hidden rounded-3xl bg-gradient-to-br from-sky-600 to-blue-700 p-4 text-white shadow-lg shadow-blue-600/20">
            <span aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-white/10" />
            <div className="relative flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-white/70">How it works</p>
                <p className="mt-0.5 text-base font-black leading-snug">See a doctor from home, today</p>
              </div>
              <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-blue-700">
                <Wallet className="h-3.5 w-3.5" /> Pay after
              </span>
            </div>
            <ol className="relative mt-4 grid grid-cols-3">
              {[
                { icon: Stethoscope, text: "Pick a doctor" },
                { icon: Video, text: "Talk on Google Meet" },
                { icon: FileText, text: "Get your prescription" },
              ].map((s, i) => (
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

        <section className="mt-5 px-4">
          <div className="mb-2.5 flex items-center justify-between">
            <h2 className="text-sm font-black text-foreground">Choose a specialty</h2>
            {specialty && (
              <button type="button" onClick={() => set({ specialty: null })} className="text-xs font-bold text-primary">
                Show all doctors
              </button>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {tiles.map((s) => {
              const { icon: Icon, tone } = specialtyIcon(s.key);
              const active = specialty?.key === s.key;
              const n = counts[s.key] ?? 0;
              return (
                <button
                  key={s.key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => set({ specialty: active ? null : s.key })}
                  className={`flex flex-col items-center rounded-2xl border px-1.5 pb-2.5 pt-3 text-center transition-colors active:scale-[0.98] ${
                    active ? "border-primary bg-primary/5 ring-2 ring-primary/25" : "border-border/60 bg-card"
                  }`}
                >
                  <span className={`flex h-11 w-11 items-center justify-center rounded-full ${tone}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="mt-1.5 line-clamp-2 text-[12px] font-bold leading-tight text-foreground">{s.label}</span>
                  <span className={`mt-0.5 text-[10px] font-semibold ${n > 0 ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground"}`}>
                    {n > 0 ? `${n} ${n === 1 ? "doctor" : "doctors"}` : "Coming soon"}
                  </span>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            aria-expanded={showAll}
            className="mt-2.5 flex w-full items-center justify-center gap-1 rounded-2xl border border-dashed border-border py-2.5 text-xs font-bold text-primary"
          >
            {showAll ? "Show fewer" : `See all ${SPECIALTIES.length} specialties`}
            <ChevronDown className={`h-4 w-4 transition-transform ${showAll ? "rotate-180" : ""}`} />
          </button>
        </section>

        <section className="mt-6 px-4">
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
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="min-w-0 truncate text-base font-black text-foreground">
                  {specialty ? specialty.label : "All doctors"}{" "}
                  <span className="font-semibold text-muted-foreground">({results.length})</span>
                </h2>
                <label className="relative shrink-0">
                  <span className="sr-only">Sort doctors</span>
                  <select
                    value={sort}
                    onChange={(e) => set({ sort: e.target.value === "recommended" ? null : e.target.value })}
                    className="h-9 appearance-none rounded-full border border-border/70 bg-card pl-3 pr-8 text-xs font-bold text-foreground outline-none"
                  >
                    {SORTS.map((s) => (
                      <option key={s.key} value={s.key}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                </label>
              </div>

              {results.length > 0 ? (
                <div className="space-y-3">
                  {results.map((d) => (
                    <DoctorListCard key={d.id} doctor={d} onOpen={() => openDoctor(d)} onBook={() => book(d)} />
                  ))}
                </div>
              ) : (
                <div className="rounded-3xl border border-border/60 bg-card px-6 py-10 text-center">
                  <span className={`mx-auto flex h-12 w-12 items-center justify-center rounded-2xl ${specialtyIcon(specialty?.key).tone}`}>
                    {(() => {
                      const Icon = specialtyIcon(specialty?.key).icon;
                      return <Icon className="h-6 w-6" />;
                    })()}
                  </span>
                  <p className="mt-3 font-bold text-foreground">
                    {doctors.length === 0
                      ? "No doctor is taking consultations right now"
                      : specialty
                        ? `No ${specialty.label} on BloodLyn yet`
                        : "No doctor matches your search"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {doctors.length === 0
                      ? "Doctors appear here as soon as they start taking bookings. Please check again soon."
                      : specialty && specialty.key !== general.key && (counts[general.key] ?? 0) > 0
                        ? "We're adding specialists. A General Physician can help with most problems and refer you if needed."
                        : "Try another specialty or a different search."}
                  </p>
                  {doctors.length > 0 && (
                    <Button
                      variant="outline"
                      className="mt-4 rounded-2xl"
                      onClick={() =>
                        specialty && specialty.key !== general.key && (counts[general.key] ?? 0) > 0
                          ? set({ specialty: general.key, q: null })
                          : set({ specialty: null, q: null })
                      }
                    >
                      {specialty && specialty.key !== general.key && (counts[general.key] ?? 0) > 0 ? "See General Physicians" : "Show all doctors"}
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
    </MobileLayout>
  );
};

export default DoctorConsultScreen;
