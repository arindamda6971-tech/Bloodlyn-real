import { useDeferredValue, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2, RefreshCw, Search, SearchX, X } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import ScreenHeader from "@/components/layout/ScreenHeader";
import IconTile from "@/components/tests/IconTile";
import TestCard, { TestList, TestListSkeleton } from "@/components/tests/TestCard";
import LabConflictDialog from "@/components/tests/LabConflictDialog";
import { useIncrementalList } from "@/components/tests/useIncrementalList";
import { useTestListActions } from "@/components/tests/useTestListActions";
import { useTestCatalogue, useTestSearchIndex, type CatalogueTest } from "@/hooks/useTestCatalogue";
import { searchTests } from "@/lib/test-search";
import { formatCount } from "@/lib/test-display";
import { getTestCategoryStyle } from "@/lib/test-categories";

const VET_PREFIX = /^(canine|feline|equine|bovine|avian)\b/i;
const NO_TESTS: CatalogueTest[] = [];

const CategoryTestsScreen = () => {
  const [searchParams] = useSearchParams();
  const categorySlug = searchParams.get("slug") || "";
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim());

  const { data: catalogue, isError, refetch, isFetching } = useTestCatalogue();
  const index = useTestSearchIndex(catalogue?.tests);
  const actions = useTestListActions();

  const categoryName =
    catalogue?.categories.find((c) => c.slug === categorySlug)?.name || searchParams.get("name") || "Tests";
  const { icon, blurb } = getTestCategoryStyle(categorySlug);

  // Every test in the category (A–Z from the catalogue), animal tests last.
  const categoryTests = useMemo<CatalogueTest[]>(() => {
    if (!catalogue) return NO_TESTS;
    const inCategory = categorySlug && categorySlug !== "all"
      ? catalogue.tests.filter((t) => t.category === categorySlug)
      : catalogue.tests;
    const human: CatalogueTest[] = [];
    const animal: CatalogueTest[] = [];
    for (const t of inCategory) (VET_PREFIX.test(t.display_name || t.test_name) ? animal : human).push(t);
    return animal.length ? [...human, ...animal] : human;
  }, [catalogue, categorySlug]);

  // null while the search index is still being built (first search of a session).
  const filtered = useMemo(() => {
    if (!deferredQuery) return categoryTests;
    if (!index) return null;
    const category = categorySlug && categorySlug !== "all" ? categorySlug : undefined;
    return searchTests(index, deferredQuery, { category }).results;
  }, [categoryTests, deferredQuery, index, categorySlug]);

  const { visible, hasMore, sentinelRef } = useIncrementalList(filtered ?? NO_TESTS);

  return (
    <MobileLayout>
      <ScreenHeader title={categoryName} />

      <div className="px-4 pt-1">
        <div className="flex items-center gap-3 px-1">
          <IconTile icon={icon} size="lg" />
          <div className="min-w-0">
            <p className="text-[15px] font-semibold text-foreground">
              {catalogue ? `${formatCount(categoryTests.length)} tests` : "Loading tests…"}
            </p>
            <p className="truncate text-[12.5px] text-muted-foreground">{blurb}</p>
          </div>
        </div>

        <div className="relative mt-4">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search in ${categoryName}`}
            className="h-11 w-full rounded-xl border border-border bg-card pl-10 pr-10 text-[14px] text-foreground outline-none transition-shadow placeholder:text-muted-foreground/70 focus:border-primary/50 focus:ring-2 focus:ring-primary/15"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              aria-label="Clear search"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 min-h-[75vh] bg-muted/60 px-4 pb-10 pt-3">
        {!catalogue || !filtered ? (
          isError ? (
            <div className="flex flex-col items-center py-12 text-center">
              <p className="text-[15px] font-semibold text-foreground">Couldn't load tests</p>
              <button
                type="button"
                onClick={() => refetch()}
                disabled={isFetching}
                className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-5 text-[14px] font-semibold text-primary-foreground active:scale-95 disabled:opacity-60"
              >
                {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Retry
              </button>
            </div>
          ) : (
            <TestListSkeleton rows={7} />
          )
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <SearchX className="mb-3 h-8 w-8 text-muted-foreground/60" strokeWidth={1.5} />
            <p className="text-[15px] font-semibold text-foreground">
              {query.trim() ? `No tests match “${query.trim()}” here` : "No tests in this category yet"}
            </p>
          </div>
        ) : (
          <>
            {deferredQuery && (
              <p className="mb-2.5 px-1 text-[12.5px] font-semibold text-foreground">
                {formatCount(filtered.length)} {filtered.length === 1 ? "test" : "tests"}
              </p>
            )}
            <TestList>
              {visible.map((test) => (
                <TestCard
                  key={test.id}
                  test={test}
                  inCart={actions.isInCart(test)}
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

      {actions.labSheet}
      <LabConflictDialog />
    </MobileLayout>
  );
};

export default CategoryTestsScreen;
