import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, FlaskConical, ShoppingCart, Plus, Search } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import ScreenHeader from "@/components/layout/ScreenHeader";
import { Button } from "@/components/ui/button";
import { useBridgeTests, type BridgeTest } from "@/hooks/useBridgeTests";
import { useCart } from "@/contexts/CartContext";
import { useMemo, useState } from "react";
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

const CategoryTestsScreen = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const categorySlug = searchParams.get("slug") || "";
  const categoryName = searchParams.get("name") || "Tests";
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const { data: bridgeData, isLoading, error } = useBridgeTests();
  const { addToCart, pendingItem, confirmReplace, cancelReplace, items } = useCart();

  const tests = useMemo(() => {
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
            {tests.map((test, index) => {
              const alreadyInCart = isInCart(test.id);

              return (
                <motion.div
                  key={test.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="soft-card"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <FlaskConical className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground text-sm">{test.test_name}</h3>
                    </div>
                    <div className="flex-shrink-0">
                      {alreadyInCart ? (
                        <Button
                          variant="softSuccess"
                          size="sm"
                          className="h-8 px-3 text-xs"
                          onClick={() => navigate("/cart")}
                        >
                          <ShoppingCart className="w-3 h-3 mr-1" />
                          Added
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-3 text-xs"
                          onClick={() => handleAddToCart(test)}
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Add
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
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