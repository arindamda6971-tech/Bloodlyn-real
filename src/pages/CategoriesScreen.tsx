import { memo, startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { ChevronRight, FlaskConical, Loader2, RefreshCw, SearchX } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import StickySearch from "@/components/ui/StickySearch";
import PremiumPageHeader from "@/components/layout/PremiumPageHeader";
import IconTile from "@/components/tests/IconTile";
import TestCard, { TestList, TestListSkeleton } from "@/components/tests/TestCard";
import LabConflictDialog from "@/components/tests/LabConflictDialog";
import { useIncrementalList } from "@/components/tests/useIncrementalList";
import { useTestListActions } from "@/components/tests/useTestListActions";
import { useTestCatalogue, useTestSearchIndex, type CatalogueTest } from "@/hooks/useTestCatalogue";
import { searchTests, type TestSearchResult } from "@/lib/test-search";
import { formatCount } from "@/lib/test-display";
import {
  compareCategories,
  EXPLORE_HERO_PHOTO,
  getTestCategoryStyle,
  HEALTH_CONCERNS,
  POPULAR_SEARCHES,
} from "@/lib/test-categories";
import { useDebounce } from "@/hooks/useDebounce";
import { useSEO } from "@/hooks/useSEO";

const EMPTY_RESULT: TestSearchResult<CatalogueTest> = { results: [], concepts: [], corrections: [] };

interface CategoryEntry {
  slug: string;
  name: string;
  count: number;
}

const SectionTitle = ({ title, aside }: { title: string; aside?: string }) => (
  <div className="mb-3 flex items-baseline justify-between px-1">
    <h2 className="text-[17px] font-bold tracking-tight text-foreground">{title}</h2>
    {aside && <span className="text-[12px] font-medium text-muted-foreground">{aside}</span>}
  </div>
);

const PopularSearches = memo(({ onPick }: { onPick: (term: string) => void }) => (
  <section className="mt-4">
    <h2 className="mb-2.5 px-5 text-[13px] font-semibold text-muted-foreground">Popular searches</h2>
    <div className="hide-scrollbar flex gap-2 overflow-x-auto px-4 pb-1" style={{ touchAction: "pan-x" }}>
      {POPULAR_SEARCHES.map((term) => (
        <button
          key={term}
          type="button"
          onClick={() => onPick(term)}
          className="h-8 shrink-0 rounded-full border border-border bg-card px-3.5 text-[13px] font-medium text-foreground/85 transition-colors active:bg-muted"
        >
          {term}
        </button>
      ))}
    </div>
  </section>
));
PopularSearches.displayName = "PopularSearches";

const HeroBanner = memo(() => (
  <section className="mt-3 px-4">
    <div className="relative h-[156px] overflow-hidden rounded-2xl bg-muted">
      <img
        src={EXPLORE_HERO_PHOTO}
        alt=""
        width={400}
        height={220}
        decoding="async"
        draggable={false}
        className="absolute inset-0 h-full w-full object-cover"
      />
      {/* Left-weighted shade keeps the white text readable on any part of the photo. */}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-900/80 via-slate-900/45 to-slate-900/5" />
      <div className="relative flex h-full max-w-[72%] flex-col justify-center px-5">
        <p className="text-[19px] font-bold leading-tight text-white">Book lab tests from home</p>
        <p className="mt-1.5 text-[12.5px] leading-snug text-white/85">
          Sample collected at your doorstep. Reports online.
        </p>
      </div>
    </div>
  </section>
));
HeroBanner.displayName = "HeroBanner";

const HealthConcerns = memo(({ onPick }: { onPick: (term: string) => void }) => (
  <section className="mt-7 px-4">
    <SectionTitle title="Browse by health concern" />
    <div className="grid grid-cols-2 gap-2.5">
      {HEALTH_CONCERNS.map(({ label, hint, search, photo }) => (
        <button
          key={label}
          type="button"
          onClick={() => onPick(search)}
          className="relative h-[112px] overflow-hidden rounded-xl bg-muted text-left transition-transform duration-100 active:scale-[0.98]"
          style={{ contain: "content" }}
        >
          <img
            src={photo}
            alt=""
            width={180}
            height={140}
            loading="lazy"
            decoding="async"
            draggable={false}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <span className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/25 to-transparent" />
          <span className="absolute inset-x-0 bottom-0 p-3">
            <span className="block truncate text-[14px] font-semibold leading-tight text-white">{label}</span>
            <span className="mt-0.5 block truncate text-[11.5px] text-white/80">{hint}</span>
          </span>
        </button>
      ))}
    </div>
  </section>
));
HealthConcerns.displayName = "HealthConcerns";

const CategoryList = memo(
  ({ categories, onOpen }: { categories: CategoryEntry[]; onOpen: (c: CategoryEntry) => void }) => (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-card divide-y divide-border/60">
      {categories.map((category) => {
        const { icon, blurb } = getTestCategoryStyle(category.slug);
        return (
          <button
            key={category.slug}
            type="button"
            onClick={() => onOpen(category)}
            className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-muted/60"
          >
            <IconTile icon={icon} />
            <span className="min-w-0 flex-1">
              <span className="line-clamp-2 text-[14.5px] font-semibold leading-tight text-foreground">{category.name}</span>
              <span className="mt-0.5 block truncate text-[12px] text-muted-foreground">{blurb}</span>
            </span>
            <span className="shrink-0 text-[12px] font-medium tabular-nums text-muted-foreground">
              {formatCount(category.count)} tests
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />
          </button>
        );
      })}
    </div>
  ),
);
CategoryList.displayName = "CategoryList";

const CategoryListSkeleton = () => (
  <div className="overflow-hidden rounded-2xl border border-border/70 bg-card divide-y divide-border/60">
    {Array.from({ length: 7 }, (_, i) => (
      <div key={i} className="flex items-center gap-3 px-4 py-3.5">
        <div className="h-9 w-9 animate-pulse rounded-lg bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 w-1/2 animate-pulse rounded bg-muted" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
        </div>
      </div>
    ))}
  </div>
);

const LoadError = ({ onRetry, retrying }: { onRetry: () => void; retrying: boolean }) => (
  <div className="flex flex-col items-center rounded-2xl border border-border/70 bg-card px-6 py-10 text-center">
    <p className="text-[15px] font-semibold text-foreground">Couldn't load tests</p>
    <p className="mt-1 text-[13px] text-muted-foreground">Check your connection and try again.</p>
    <button
      type="button"
      onClick={onRetry}
      disabled={retrying}
      className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-5 text-[14px] font-semibold text-primary-foreground active:scale-95 disabled:opacity-60"
    >
      {retrying ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
      Retry
    </button>
  </div>
);

const CategoriesScreen = () => {
  useSEO({
    title: "Explore Tests | BloodLyn",
    description: "Search 3,000+ lab tests — sugar, thyroid, CBC, vitamins and more — with home sample collection.",
  });
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  // Searching is on-device and takes a few ms, so results follow every keystroke;
  // deferring keeps the input itself responsive on slow phones.
  const deferredQuery = useDeferredValue(query.trim());

  // Keep the search in the URL so coming back from a test restores it.
  const debouncedQuery = useDebounce(query.trim(), 400);
  useEffect(() => {
    if ((searchParams.get("q") ?? "") === debouncedQuery) return;
    // Keep the bottom bar's history marker so Back still returns to Home.
    setSearchParams(debouncedQuery ? { q: debouncedQuery } : {}, { replace: true, state: location.state });
  }, [debouncedQuery, searchParams, setSearchParams, location.state]);

  const { data: catalogue, isError, refetch, isFetching } = useTestCatalogue();
  const index = useTestSearchIndex(catalogue?.tests);
  const actions = useTestListActions();

  const categoryNames = useMemo(
    () => new Map((catalogue?.categories ?? []).map((c) => [c.slug, c.name])),
    [catalogue],
  );

  const categories = useMemo<CategoryEntry[]>(() => {
    if (!catalogue) return [];
    return catalogue.categories
      .map((c) => ({ slug: c.slug, name: c.name, count: catalogue.countsBySlug.get(c.slug) ?? 0 }))
      .filter((c) => c.count > 0)
      .sort(compareCategories);
  }, [catalogue]);

  const search = useMemo(
    () => (index && deferredQuery ? searchTests(index, deferredQuery) : EMPTY_RESULT),
    [index, deferredQuery],
  );
  const { visible, hasMore, sentinelRef } = useIncrementalList(search.results);

  const correctedQuery = useMemo(() => {
    if (!search.corrections.length) return null;
    return search.corrections.reduce(
      (text, { from, to }) => text.replace(new RegExp(`\\b${from}\\b`, "i"), to),
      deferredQuery.toLowerCase(),
    );
  }, [search.corrections, deferredQuery]);

  const openCategory = (category: CategoryEntry) =>
    navigate(`/category-tests?slug=${encodeURIComponent(category.slug)}&name=${encodeURIComponent(category.name)}`);

  // The category list sits below the fold on a phone, so draw it one frame after the
  // visible part, at low priority. On a 6x-throttled phone profile this splits the first
  // open's layout in two smaller pieces; nothing on screen changes.
  const [belowFoldReady, setBelowFoldReady] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => startTransition(() => setBelowFoldReady(true)));
    return () => cancelAnimationFrame(frame);
  }, []);

  const totalTests = catalogue?.tests.length ?? 0;
  const searching = query.trim().length > 0;
  const resultsReady = !!catalogue && !!index;

  return (
    <MobileLayout>
      <div className="px-5 pt-3 pb-1">
        <PremiumPageHeader
          title="Explore Tests"
          subtitle={
            totalTests
              ? `${formatCount(totalTests)} lab tests · Home sample collection`
              : "Lab tests with home sample collection"
          }
          icon={FlaskConical}
        />
      </div>

      <StickySearch value={query} onChange={setQuery} placeholder="Search tests, e.g. sugar, thyroid, CBC" />

      {searching ? (
        <div className="min-h-[75vh] bg-muted/60 px-4 pb-10 pt-3">
          {!resultsReady ? (
            isError ? (
              <LoadError onRetry={() => refetch()} retrying={isFetching} />
            ) : (
              <TestListSkeleton />
            )
          ) : search.results.length === 0 ? (
            <div className="flex flex-col items-center px-4 py-12 text-center">
              <SearchX className="mb-3 h-8 w-8 text-muted-foreground/60" strokeWidth={1.5} />
              <p className="text-[15px] font-semibold text-foreground">No tests match “{query.trim()}”</p>
              <p className="mt-1 text-[13px] text-muted-foreground">Try a simpler word, or one of these:</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {POPULAR_SEARCHES.slice(0, 6).map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => setQuery(term)}
                    className="h-8 rounded-full border border-border bg-card px-3.5 text-[13px] font-medium text-foreground/85 active:bg-muted"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="mb-2.5 px-1 text-[12.5px] leading-relaxed text-muted-foreground">
                {correctedQuery && (
                  <p>
                    Showing results for <span className="font-semibold text-foreground">{correctedQuery}</span>
                  </p>
                )}
                <p>
                  <span className="font-semibold text-foreground">
                    {formatCount(search.results.length)} {search.results.length === 1 ? "test" : "tests"}
                  </span>
                  {search.concepts.length > 0 && <> · {search.concepts.slice(0, 2).join(", ")}</>}
                </p>
              </div>

              <TestList>
                {visible.map((test) => (
                  <TestCard
                    key={test.id}
                    test={test}
                    inCart={actions.isInCart(test)}
                    categoryLabel={categoryNames.get(test.category)}
                    onOpen={actions.onOpen}
                    onAdd={actions.onAdd}
                    onOpenCart={actions.onOpenCart}
                  />
                ))}
              </TestList>
              {hasMore && (
                <div ref={sentinelRef} className="flex h-12 items-center justify-center" aria-hidden="true">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="pb-10">
          <HeroBanner />
          <PopularSearches onPick={setQuery} />
          <HealthConcerns onPick={setQuery} />

          <section className="mt-7 px-4">
            <SectionTitle title="All categories" aside={categories.length ? `${categories.length} categories` : undefined} />
            {catalogue && belowFoldReady ? (
              <CategoryList categories={categories} onOpen={openCategory} />
            ) : isError ? (
              <LoadError onRetry={() => refetch()} retrying={isFetching} />
            ) : (
              <CategoryListSkeleton />
            )}
          </section>
        </div>
      )}

      {actions.labSheet}
      <LabConflictDialog />
    </MobileLayout>
  );
};

export default CategoriesScreen;
