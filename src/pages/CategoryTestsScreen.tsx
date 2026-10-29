import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, FlaskConical, ShoppingCart, Plus, Search, ChevronRight } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import ScreenHeader from "@/components/layout/ScreenHeader";
import BannerGraphic from "@/components/BannerGraphic";
import { Button } from "@/components/ui/button";
import { useCategoryTests, type BridgeTest } from "@/hooks/useBridgeTests";
import { useSmartTestSearch } from "@/hooks/useSmartTestSearch";
import { useCart } from "@/contexts/CartContext";
import { useDebounce } from "@/hooks/useDebounce";
import { toast } from "sonner";
import { simplifyTestName } from "@/utils/simplify-test-name";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// High-performance memoized test item
const TestItem = React.memo(({
  test,
  onOpen,
}: {
  test: BridgeTest;
  onOpen: (t: BridgeTest) => void;
}) => (
  <div
    onClick={() => onOpen(test)}
    className="soft-card p-4 transition-transform active:scale-[0.98] cursor-pointer"
  >
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
        <FlaskConical className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-foreground text-sm truncate">{simplifyTestName(test.test_name)}</h3>
      </div>
      <div className="flex-shrink-0">
        <ChevronRight className="w-5 h-5 text-muted-foreground/50" />
      </div>
    </div>
  </div>
));

TestItem.displayName = "TestItem";

const CategoryTestsScreen = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const categorySlug = searchParams.get("slug") || "";
  const categoryName = searchParams.get("name") || "Tests";
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Browsing: the category loads 50 tests at a time as the user scrolls, so it
  // opens quickly and still reaches every test (the bridge sends ≤500 per call).
  const {
    data: pagedData,
    isLoading: isBrowseLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
  } = useCategoryTests(categorySlug);
  const { addToCart, pendingItem, confirmReplace, cancelReplace, items, hasItem } = useCart();
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Searching: ask the server within this category, so tests on pages not yet
  // loaded are found too.
  const searching = debouncedSearchQuery.trim().length > 0;
  const { results: searchResults, isSearching } = useSmartTestSearch(debouncedSearchQuery, {
    category: categorySlug,
    limit: 50,
    enabled: searching,
  });

  const browseTests = useMemo(() => {
    const seen = new Set<string>();
    const merged: BridgeTest[] = [];
    for (const page of pagedData?.pages ?? []) {
      for (const test of page.tests ?? []) {
        if (!seen.has(test.id)) {
          seen.add(test.id);
          merged.push(test);
        }
      }
    }
    return merged;
  }, [pagedData]);

  const totalTests = pagedData?.pages[0]?.pagination?.total;
  const tests = searching ? searchResults : browseTests;
  const isLoading = searching
    ? tests.length === 0 && (isSearching || searchQuery.trim() !== debouncedSearchQuery.trim())
    : isBrowseLoading;

  const isInCart = (testId: string, testName: string) => hasItem(testId, testName);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || searching || !hasNextPage || isFetchNextPageError) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isFetchingNextPage) fetchNextPage();
      },
      { rootMargin: "600px 0px" }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [searching, hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage]);


  const handleAddToCart = (test: BridgeTest) => {
    const price = test.price > 0 ? test.price : test.collection_fee || 0;
    const success = addToCart({
      id: test.id,
      name: test.test_name,
      price,
    });
    if (success) {
      toast.success(`${test.test_name} added to cart`);
    }
  };

  const handleOpenTest = useCallback(
    (test: BridgeTest) => navigate(`/test/${test.id}`, { state: { bridgeTest: test } }),
    [navigate]
  );

  const handleConfirmReplace = () => {
    confirmReplace();
    toast.success("Cart replaced with new lab items");
  };

  return (
    <MobileLayout>
      <ScreenHeader title={categoryName} />

      <div className="px-4 mt-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search in ${categoryName}...`}
            className="w-full h-11 rounded-xl bg-muted/60 border border-border/60 pl-10 pr-10 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/30 transition-all text-foreground placeholder:text-muted-foreground"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              aria-label="Clear search"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
              </svg>
            </button>
          )}
        </div>
      </div>



      <div className="px-4 mt-4 pb-32">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : !searching && error ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Failed to load tests</p>
          </div>
        ) : tests.length === 0 ? (
          <div className="text-center py-12">
            <FlaskConical className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">
              {searchQuery.trim() 
                ? `No results found for "${searchQuery}"` 
                : "No tests available in this category yet"}
            </p>
          </div>
        ) : (
          <div className="space-y-3 list-virtual-test">
            {!searching && totalTests !== undefined && (
              <p className="text-xs font-semibold text-muted-foreground">
                {totalTests.toLocaleString("en-IN")} {totalTests === 1 ? "test" : "tests"}
              </p>
            )}
            {tests.map((test) => (
              <TestItem
                key={test.id}
                test={test}
                onOpen={handleOpenTest}
              />
            ))}
            {!searching && hasNextPage && (
              isFetchNextPageError ? (
                <div className="flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground">
                  Couldn't load more tests.
                  <button type="button" className="font-bold text-primary" onClick={() => fetchNextPage()}>
                    Retry
                  </button>
                </div>
              ) : (
                <div ref={loadMoreRef} className="h-8 flex items-center justify-center" aria-label="Loading more tests">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                </div>
              )
            )}
          </div>
        )}
      </div>



      {/* Lab Conflict Alert Dialog */}
      <AlertDialog open={!!pendingItem} onOpenChange={(open) => !open && cancelReplace()}>
        <AlertDialogContent className="max-w-[90%] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Different Lab Selected</AlertDialogTitle>
            <AlertDialogDescription>
              You have items from <span className="font-semibold text-foreground">{pendingItem?.existingLabName}</span>.
              You can't add tests from another lab at the same time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-2">
            <AlertDialogCancel className="flex-1 mt-0" onClick={cancelReplace}>Cancel</AlertDialogCancel>
            <AlertDialogAction className="flex-1" onClick={handleConfirmReplace}>Replace Cart</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MobileLayout>
  );
};

export default CategoryTestsScreen;