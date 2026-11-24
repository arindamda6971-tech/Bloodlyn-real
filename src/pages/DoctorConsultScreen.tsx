import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, LayoutGrid, RefreshCw, Search, SearchX, ShieldCheck, Siren, Stethoscope, Video, Wallet, X, type LucideIcon } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DoctorListCard } from "@/components/doctors/DoctorListCard";
import { specialtyIcon } from "@/components/doctors/specialtyIcons";
import { useDoctors } from "@/hooks/useDoctors";
import { useSEO } from "@/hooks/useSEO";
import { SPECIALTIES, consultsOnline, defaultType, doctorCounts, findDoctors, rankSpecialties, specialtyByKey, specialtyOf, type DoctorSort } from "@/lib/doctor-finder";
import type { Doctor } from "@/types/consultation";
import type { BookDoctorState } from "@/pages/BookDoctorScreen";

const SORTS: Array<{ key: DoctorSort; label: string }> = [
  { key: "recommended", label: "Recommended" },
  { key: "fee", label: "Lowest fee" },
  { key: "experience", label: "Most experienced" },
];

const ASSURANCES: Array<{ icon: LucideIcon; title: string; sub: string }> = [
  { icon: ShieldCheck, title: "Verified", sub: "doctors" },
  { icon: Video, title: "Video or", sub: "audio call" },
  { icon: Wallet, title: "Pay after", sub: "the call" },
];

// Long one-word names break with a hyphen when a tile is too narrow for them.
const TILE_LABEL: Record<string, string> = {
  women: "Gynae­cologist",
  child: "Paedia­trician",
  skin: "Derma­tologist",
  stomach: "Gastro­enterologist",
  lungs: "Pulmo­nologist",
  heart: "Cardio­logist",
  mind: "Psych­iatrist",
  kidney: "Nephro­logist",
};

interface TileProps {
  id: string;
  label: string;
  icon: LucideIcon;
  tone: string;
  active: boolean;
  /** No doctor in this specialty yet: shown faded, with "Soon". */
  empty: boolean;
  wide: boolean;
  onClick: () => void;
}

function SpecialtyTile({ id, label, icon: Icon, tone, active, empty, wide, onClick }: TileProps) {
  return (
    <button
      id={id}
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`group flex shrink-0 snap-start flex-col items-center text-center ${wide ? "w-auto" : "w-[76px]"}`}
    >
      <span
        className={`flex h-14 w-14 items-center justify-center rounded-full transition-all ${tone} ${
          active ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : "group-active:scale-95"
        } ${empty && !active ? "opacity-45 saturate-50" : ""}`}
      >
        <Icon className="h-6 w-6" aria-hidden />
      </span>
      <span
        lang="en"
        className={`mt-2 line-clamp-2 w-full hyphens-manual text-[11px] font-semibold leading-tight ${
          active ? "text-primary" : empty ? "text-muted-foreground" : "text-foreground"
        }`}
      >
        {label}
      </span>
      {empty && <span className="mt-0.5 text-[10px] font-medium text-muted-foreground">Soon</span>}
    </button>
  );
}

function DoctorCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
      <div className="flex gap-3.5 p-4">
        <Skeleton className="h-[60px] w-[60px] shrink-0 rounded-2xl" />
        <div className="flex-1 space-y-2 pt-0.5">
          <Skeleton className="h-4 w-2/3 rounded-md" />
          <Skeleton className="h-3.5 w-1/3 rounded-md" />
          <Skeleton className="h-3 w-1/2 rounded-md" />
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-border/60 px-4 py-3">
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-24 rounded-md" />
          <Skeleton className="h-3.5 w-36 rounded-md" />
        </div>
        <Skeleton className="h-10 w-20 rounded-xl" />
      </div>
    </div>
  );
}

/**
 * Consult a doctor online: pick a specialty (or search a doctor, specialty or problem)
 * and the doctors taking consultations today are listed. What the patient chose lives in
 * the address, so Back from a doctor's page comes back to the same list.
 */
const DoctorConsultScreen = () => {
  useSEO({ title: "Consult a doctor | BloodLyn", description: "Consult a verified doctor online on video or audio." });
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { data: doctors = [], isLoading, isError, refetch, isFetching } = useDoctors();

  const specialty = specialtyByKey(params.get("specialty"));
  const sort = (SORTS.some((s) => s.key === params.get("sort")) ? params.get("sort") : "recommended") as DoctorSort;
  const search = params.get("q") ?? "";
  const [showAll, setShowAll] = useState(false);

  const set = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    setParams(next, { replace: true });
  };

  const counts = useMemo(() => doctorCounts(doctors), [doctors]);
  const onlineCount = useMemo(() => doctors.filter(consultsOnline).length, [doctors]);
  const results = useMemo(() => findDoctors(doctors, { specialty: specialty?.key, search, sort }), [doctors, specialty, search, sort]);
  // The specialties with the most doctors first.
  const ranked = useMemo(() => rankSpecialties(counts), [counts]);
  const general = SPECIALTIES[0];
  const known = !isLoading && !isError;

  // Keep the chosen specialty in view in the scrolling row (e.g. coming Back to the list).
  useEffect(() => {
    if (showAll) return;
    const el = document.getElementById(`specialty-${specialty?.key ?? "all"}`);
    el?.scrollIntoView?.({ inline: "center", block: "nearest" });
  }, [specialty?.key, showAll]);

  const book = (doctor: Doctor) => {
    const state: BookDoctorState = { doctor, type: defaultType(doctor), specialty: specialty?.key ?? specialtyOf(doctor)?.key ?? null };
    navigate("/book-doctor", { state });
  };
  const openDoctor = (doctor: Doctor) => navigate(`/doctor/${doctor.id}${specialty ? `?specialty=${specialty.key}` : ""}`);

  const suggestGeneral = !!specialty && specialty.key !== general.key && (counts[general.key] ?? 0) > 0;
  const EmptyIcon = search ? SearchX : specialty ? specialtyIcon(specialty.key).icon : Stethoscope;
  const emptyTone = search || !specialty ? "bg-muted text-muted-foreground" : specialtyIcon(specialty.key).tone;

  return (
    <MobileLayout showNav={false}>
      <div className="sticky top-0 z-40 border-b border-border/50 bg-background pb-3">
        <div className="flex items-center gap-1 px-2 pt-2">
          <button type="button" onClick={() => navigate(-1)} aria-label="Back" className="flex h-11 w-11 items-center justify-center rounded-full active:bg-muted">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <h1 className="flex-1 text-[17px] font-bold tracking-tight text-foreground">Consult a doctor</h1>
        </div>
        <div className="mt-1 px-4">
          <label className="relative block">
            <span className="sr-only">Search a doctor, specialty or problem</span>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input
              type="search"
              enterKeyHint="search"
              value={search}
              onChange={(e) => set({ q: e.target.value.slice(0, 60) || null })}
              placeholder="Search doctor, specialty or problem"
              className="h-11 w-full appearance-none rounded-xl border border-transparent bg-muted/70 pl-11 pr-10 text-[14px] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/40 focus:bg-background focus:ring-4 focus:ring-primary/10 [&::-webkit-search-cancel-button]:hidden"
            />
            {search && (
              <button type="button" aria-label="Clear search" onClick={() => set({ q: null })} className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground active:bg-muted">
                <X className="h-4 w-4" />
              </button>
            )}
          </label>
        </div>
      </div>

      <div className="pb-[calc(var(--sab)+32px)]">
        {!search && (
          <section className="relative mx-4 mt-4 overflow-hidden rounded-[20px] border border-sky-100 bg-gradient-to-br from-sky-50 via-background to-background p-4 dark:border-sky-500/15 dark:from-sky-500/10">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="text-[16px] font-bold leading-snug tracking-tight text-foreground">See a doctor from home, today</h2>
                <p className="mt-1 text-[12.5px] leading-snug text-muted-foreground">
                  The doctor calls you on Google Meet, and your prescription arrives in the app.
                </p>
              </div>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md shadow-primary/25">
                <Stethoscope className="h-5 w-5" aria-hidden />
              </span>
            </div>
            <ul className="mt-3.5 grid grid-cols-3 gap-2">
              {ASSURANCES.map((a) => (
                <li key={a.title} className="flex items-center gap-2 rounded-xl bg-background/90 px-2.5 py-2 ring-1 ring-border/60">
                  <a.icon className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                  <span className="text-[11px] font-semibold leading-tight text-foreground">
                    {a.title}
                    <span className="block font-medium text-muted-foreground">{a.sub}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mt-6" aria-labelledby="specialty-heading">
          <div className="mb-3 flex items-center justify-between px-4">
            <h2 id="specialty-heading" className="text-[15px] font-bold text-foreground">
              Browse by specialty
            </h2>
            <button type="button" onClick={() => setShowAll((v) => !v)} aria-expanded={showAll} className="-mr-2 rounded-full px-2 py-1 text-[13px] font-semibold text-primary active:bg-primary/10">
              {showAll ? "Show less" : `See all ${SPECIALTIES.length}`}
            </button>
          </div>
          <div className={showAll ? "grid grid-cols-4 gap-x-2 gap-y-4 px-4" : "flex snap-x gap-2 overflow-x-auto scroll-px-4 px-4 pb-1 scrollbar-none"}>
            <SpecialtyTile
              id="specialty-all"
              label="All doctors"
              icon={LayoutGrid}
              tone="bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-200"
              active={!specialty}
              empty={false}
              wide={showAll}
              onClick={() => set({ specialty: null })}
            />
            {ranked.map((s) => {
              const { icon, tone } = specialtyIcon(s.key);
              const active = specialty?.key === s.key;
              return (
                <SpecialtyTile
                  key={s.key}
                  id={`specialty-${s.key}`}
                  label={TILE_LABEL[s.key] ?? s.label}
                  icon={icon}
                  tone={tone}
                  active={active}
                  empty={known && !(counts[s.key] > 0)}
                  wide={showAll}
                  onClick={() => set({ specialty: active ? null : s.key })}
                />
              );
            })}
          </div>
        </section>

        <section className="mt-7 px-4" aria-labelledby="doctors-heading">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="doctors-heading" className="min-w-0 truncate text-[15px] font-bold text-foreground">
              {specialty ? specialty.label : search ? "Search results" : "Doctors available today"}
            </h2>
            {known && results.length > 0 && (
              <span className="shrink-0 text-xs font-medium text-muted-foreground">
                {results.length} {results.length === 1 ? "doctor" : "doctors"}
              </span>
            )}
          </div>

          <div role="radiogroup" aria-label="Sort doctors" className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none">
            {SORTS.map((s) => {
              const on = s.key === sort;
              return (
                <button
                  key={s.key}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => set({ sort: s.key === "recommended" ? null : s.key })}
                  className={`h-8 shrink-0 rounded-full px-3.5 text-xs font-semibold transition-colors ${
                    on ? "bg-foreground text-background" : "bg-card text-muted-foreground ring-1 ring-inset ring-border"
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>

          <div className="mt-3">
            {isLoading ? (
              <div className="space-y-3" role="status" aria-label="Finding doctors">
                {[0, 1, 2].map((i) => (
                  <DoctorCardSkeleton key={i} />
                ))}
              </div>
            ) : isError ? (
              <div className="rounded-2xl border border-border/60 bg-card px-6 py-10 text-center">
                <p className="font-bold text-foreground">Couldn't load doctors</p>
                <p className="mt-1 text-sm text-muted-foreground">Check your connection and try again.</p>
                <Button variant="outline" className="mt-4 rounded-xl" onClick={() => refetch()} disabled={isFetching}>
                  <RefreshCw className={`mr-1.5 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} /> Try again
                </Button>
              </div>
            ) : results.length > 0 ? (
              <div className="space-y-3">
                {results.map((d) => (
                  <DoctorListCard key={d.id} doctor={d} onOpen={() => openDoctor(d)} onBook={() => book(d)} />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-card/60 px-6 py-10 text-center">
                <span className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${emptyTone}`}>
                  <EmptyIcon className="h-6 w-6" aria-hidden />
                </span>
                <p className="mt-3 font-bold text-foreground">
                  {onlineCount === 0
                    ? "No doctor is taking consultations right now"
                    : search
                      ? `No doctor found for "${search}"`
                      : `No ${specialty?.label ?? "doctor"} on BloodLyn yet`}
                </p>
                <p className="mx-auto mt-1 max-w-[17rem] text-sm text-muted-foreground">
                  {onlineCount === 0
                    ? "Doctors appear here as soon as they start taking bookings. Please check again soon."
                    : suggestGeneral
                      ? "We're adding specialists. A General Physician can help with most problems and refer you if needed."
                      : "Try another specialty or a different search."}
                </p>
                {onlineCount > 0 && (
                  <Button
                    variant="outline"
                    className="mt-4 rounded-xl"
                    onClick={() => (suggestGeneral ? set({ specialty: general.key, q: null }) : set({ specialty: null, q: null }))}
                  >
                    {suggestGeneral ? "See General Physicians" : "Show all doctors"}
                  </Button>
                )}
              </div>
            )}
          </div>
        </section>

        <div className="mx-4 mt-8 space-y-3">
          <div className="flex gap-3 rounded-2xl bg-rose-50 p-3.5 ring-1 ring-rose-100 dark:bg-rose-500/10 dark:ring-rose-500/20">
            <Siren className="mt-0.5 h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" aria-hidden />
            <p className="text-xs leading-relaxed text-rose-950 dark:text-rose-100">
              <span className="font-bold">Not for emergencies.</span> For chest pain, trouble breathing, heavy bleeding or a serious injury, call 112 or go to the nearest hospital.
            </p>
          </div>
          <p className="flex items-start gap-2 px-1 text-[11px] leading-relaxed text-muted-foreground">
            <ShieldCheck className="mt-px h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
            Every doctor on BloodLyn is registered with a medical council and checked by us.
          </p>
        </div>
      </div>
    </MobileLayout>
  );
};

export default DoctorConsultScreen;
