import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, FlaskConical, ShoppingCart, Plus, Search, ChevronRight } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import ScreenHeader from "@/components/layout/ScreenHeader";
import BannerGraphic from "@/components/BannerGraphic";
import { Button } from "@/components/ui/button";
import { useBridgeTests, type BridgeTest } from "@/hooks/useBridgeTests";
import { useCart } from "@/contexts/CartContext";
import { useDebounce } from "@/hooks/useDebounce";
import { toast } from "sonner";
import { intelligentSearch } from "@/utils/search-intelligence";
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

  const params = useMemo(() => {
    const p: { category?: string; limit?: number } = {};
    if (categorySlug && categorySlug !== "all") {
      p.category = categorySlug;
    }
    p.limit = 5000; // Load all tests for this specific category
    return p;
  }, [categorySlug]);

  const { data: bridgeData, isLoading, error } = useBridgeTests(params);
  const { addToCart, pendingItem, confirmReplace, cancelReplace, items, hasItem } = useCart();

  // Keep the complete catalogue in the query cache, but mount only nearby
  // rows. The previous requestAnimationFrame loop mounted every test as soon
  // as the page opened, blocking the route transition back to Home.
  const [visibleCount, setVisibleCount] = useState(30);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const allTests = useMemo(() => {
    if (!bridgeData?.tests) return [];
    
    const query = debouncedSearchQuery.trim();
    if (query) {
      const matchedIds = new Set(
        intelligentSearch(query, bridgeData.tests, 50).map((result) => result.id)
      );
      return bridgeData.tests.filter((test) => matchedIds.has(test.id));
    }
    
    return bridgeData.tests;
  }, [bridgeData, debouncedSearchQuery]);

  const tests = useMemo(() => allTests.slice(0, visibleCount), [allTests, visibleCount]);

  const isInCart = (testId: string, testName: string) => hasItem(testId, testName);

  useEffect(() => {
    setVisibleCount(30);
  }, [categorySlug, debouncedSearchQuery]);

  const revealNextBatch = useCallback(() => {
    setVisibleCount((current) => Math.min(current + 30, allTests.length));
  }, [allTests.length]);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || visibleCount >= allTests.length) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) revealNextBatch();
      },
      { rootMargin: "240px 0px" }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [revealNextBatch, visibleCount, allTests.length]);


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
        ) : error ? (
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
            {tests.map((test) => (
              <TestItem
                key={test.id}
                test={test}
                onOpen={(t) => navigate(`/test/${t.id}`, { state: { bridgeTest: t } })}
              />
            ))}
            {visibleCount < allTests.length && (
              <div ref={loadMoreRef} className="h-8 flex items-center justify-center" aria-hidden="true">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
              </div>
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