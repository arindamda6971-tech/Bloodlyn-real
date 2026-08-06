import React, { useMemo, useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, FlaskConical, ShoppingCart, Plus, Search } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import ScreenHeader from "@/components/layout/ScreenHeader";
import BannerGraphic from "@/components/BannerGraphic";
import { Button } from "@/components/ui/button";
import { useBridgeTests, type BridgeTest } from "@/hooks/useBridgeTests";
import { useCart } from "@/contexts/CartContext";
import { useDebounce } from "@/hooks/useDebounce";
import { toast } from "sonner";
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
  isInCart,
  onAdd,
  onViewCart,
  onOpen,
}: {
  test: BridgeTest;
  isInCart: boolean;
  onAdd: (t: BridgeTest) => void;
  onViewCart: () => void;
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
        <h3 className="font-semibold text-foreground text-sm truncate">{test.test_name}</h3>
        <p className="text-[10px] text-muted-foreground mt-0.5">Report in {test.report_delivery_time || "24h"}</p>
      </div>
      <div className="flex-shrink-0">
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (isInCart) onViewCart();
            else onAdd(test);
          }}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
            isInCart
              ? "bg-success text-white shadow-md active:scale-90"
              : "bg-[#38bdf8] text-white shadow-md active:scale-90"
          }`}
        >
          {isInCart ? <ShoppingCart className="w-4 h-4" /> : <Plus className="w-5 h-5" />}
        </button>
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

  const { data: bridgeData, isLoading, error } = useBridgeTests();
  const { addToCart, pendingItem, confirmReplace, cancelReplace, items } = useCart();

  // Incremental rendering for ultra-smooth list population
  const [visibleCount, setVisibleCount] = useState(20);

  const allTests = useMemo(() => {
    if (!bridgeData?.tests) return [];
    
    let filtered = bridgeData.tests;
    if (categorySlug !== "all") {
      filtered = filtered.filter((t) => t.category === categorySlug);
    }
    
    if (debouncedSearchQuery.trim()) {
      const q = debouncedSearchQuery.toLowerCase().trim();
      filtered = filtered.filter((t) => t.test_name.toLowerCase().includes(q));
    }
    
    return filtered;
  }, [bridgeData, categorySlug, debouncedSearchQuery]);

  const tests = useMemo(() => allTests.slice(0, visibleCount), [allTests, visibleCount]);

  useEffect(() => {
    if (visibleCount < allTests.length) {
      const id = requestAnimationFrame(() => {
        setVisibleCount(prev => Math.min(prev + 20, allTests.length));
      });
      return () => cancelAnimationFrame(id);
    }
  }, [visibleCount, allTests.length]);

  const isInCart = (testId: string) => items.some((item) => item.id === testId);

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

      <section className="px-4 mt-8 mb-8">
        <button className="w-full relative overflow-hidden rounded-3xl group active:scale-[0.98] transition-transform bg-gradient-to-br from-[#38bdf8] to-[#0284c7] shadow-lg shadow-sky-500/20 h-[190px]">
          
          {/* Background Glows */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/20 blur-3xl rounded-full translate-x-12 -translate-y-12" />
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/20 blur-3xl rounded-full -translate-x-12 translate-y-12" />
          
          {/* Faint Crosses */}
          <div className="absolute text-white/30 bottom-10 right-16 text-2xl font-light leading-none">+</div>
          <div className="absolute text-white/30 bottom-4 right-6 text-lg font-light leading-none">+</div>

          {/* Heartbeat Line SVG */}
          <div className="absolute bottom-6 left-0 right-0 opacity-30">
            <svg viewBox="0 0 400 60" preserveAspectRatio="none" className="w-full h-16" stroke="white" strokeWidth="1.5" fill="none">
              <path d="M0,40 L130,40 L150,10 L170,55 L190,25 L210,40 L400,40" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          {/* Content */}
          <div className="absolute inset-0 p-5 flex flex-col justify-between">
            <div className="flex flex-col items-center justify-center pt-2">
              <p className="text-white/90 text-[10px] font-black uppercase tracking-widest mb-1.5">Doctor Recommended</p>
              <h3 className="text-white text-[22px] font-black leading-tight tracking-tight text-center">Full Body Health<br/>Checkup Today</h3>
            </div>
            <div className="flex items-end pb-1">
              <span className="bg-white text-[#0284c7] text-sm font-black px-6 py-2.5 rounded-full shadow-lg shadow-black/10">
                Book Now →
              </span>
            </div>
          </div>
        </button>
      </section>

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
          <div className="space-y-3">
            {tests.map((test) => (
              <TestItem
                key={test.id}
                test={test}
                isInCart={isInCart(test.id)}
                onAdd={handleAddToCart}
                onViewCart={() => navigate("/cart")}
                onOpen={(t) => navigate(`/test/${t.id}`, { state: { bridgeTest: t } })}
              />
            ))}
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