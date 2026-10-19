import { memo, useMemo, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Droplets,
  Activity,
  Pill,
  Sun,
  Heart,
  UserCheck,
  Stethoscope,
  Baby,
  Brain,
  Bone,
  Search,
  Loader2,
  Microscope,
  Dna,
  ShieldCheck,
  Thermometer,
  Eye,
  Ear,
  Syringe,
  Beaker,
  TestTubes,
  Scan,
  HeartPulse,
  Wind,
  Plus,
  Check,
  type LucideIcon,
} from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import StickySearch from "@/components/ui/StickySearch";
import PremiumPageHeader from "@/components/layout/PremiumPageHeader";
import { useBridgeTests, type BridgeTest } from "@/hooks/useBridgeTests";
import { useCart } from "@/contexts/CartContext";
import { useDebounce } from "@/hooks/useDebounce";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useSEO } from "@/hooks/useSEO";
import { Skeleton } from "@/components/ui/skeleton";
import { simplifyTestName } from "@/utils/simplify-test-name";
import { useEffect } from "react";

const useDelayedLoading = (isLoading: boolean, delayMs: number = 150) => {
  const [showLoading, setShowLoading] = useState(false);

  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => setShowLoading(true), delayMs);
      return () => clearTimeout(timer);
    } else {
      setShowLoading(false);
    }
  }, [isLoading, delayMs]);

  return showLoading;
};

// Hand-picked icons and colors for specific known categories
const CATEGORY_MAP: Record<string, { icon: LucideIcon; color: string; image?: string }> = {
  "cardiac": { icon: HeartPulse, color: "bg-rose-100 text-rose-600", image: "/categories/cardiac.jpg" },
  "diabetes": { icon: Activity, color: "bg-sky-100 text-sky-600" },
  "kidney": { icon: Droplets, color: "bg-amber-100 text-amber-600" },
  "liver": { icon: Beaker, color: "bg-emerald-100 text-emerald-600" },
  "thyroid": { icon: Activity, color: "bg-purple-100 text-purple-600" },
  "fever": { icon: Thermometer, color: "bg-orange-100 text-orange-600" },
  "full body": { icon: Scan, color: "bg-indigo-100 text-indigo-600" },
  "vitamin": { icon: Pill, color: "bg-yellow-100 text-yellow-600", image: "/categories/vitamin.jpg" },
  "bone": { icon: Bone, color: "bg-slate-100 text-slate-700" },
  "pregnancy": { icon: Baby, color: "bg-pink-100 text-pink-600" },
  "neurology": { icon: Brain, color: "bg-cyan-100 text-cyan-600" },
  "infection": { icon: ShieldCheck, color: "bg-red-100 text-red-600" },
  "immunity": { icon: ShieldCheck, color: "bg-teal-100 text-teal-600" },
  "blood": { icon: Syringe, color: "bg-red-50 text-red-500", image: "/categories/hematology.jpg" },
  "chemistry": { icon: Beaker, color: "bg-blue-100 text-blue-600", image: "/categories/chemistry.jpg" },
  "coagulation": { icon: Droplets, color: "bg-red-100 text-red-600", image: "/categories/coagulation.jpg" },
  "cytology": { icon: Microscope, color: "bg-purple-100 text-purple-600", image: "/categories/cytology.jpg" },
  "genetics": { icon: Dna, color: "bg-indigo-100 text-indigo-600", image: "/categories/genetics.jpg" },
  "hematology": { icon: Syringe, color: "bg-red-50 text-red-500", image: "/categories/hematology.jpg" },
  "microbiology": { icon: Scan, color: "bg-teal-100 text-teal-600", image: "/categories/microbiology.jpg" },
  "urine": { icon: Beaker, color: "bg-yellow-100 text-yellow-600", image: "/categories/urine.jpg" },
  "stool": { icon: Beaker, color: "bg-orange-100 text-orange-600", image: "/categories/urine.jpg" }, // reusing urine container for stool 
  "allergy": { icon: Wind, color: "bg-sky-100 text-sky-600", image: "/categories/allergy.jpg" },
};

const iconPool: LucideIcon[] = [
  Stethoscope, Activity, Heart, Scan, Microscope, TestTubes, Dna, Eye, Ear, Wind
];

const colorPool: string[] = [
  "bg-primary/10 text-primary",
  "bg-secondary/10 text-secondary",
  "bg-blue-100 text-blue-600",
  "bg-indigo-100 text-indigo-600",
  "bg-teal-100 text-teal-600",
];

const getCategoryStyle = (name: string, slug: string) => {
  const key = name.toLowerCase();
  for (const [k, v] of Object.entries(CATEGORY_MAP)) {
    if (key.includes(k) || (slug && slug.includes(k))) return v;
  }
  
  // Deterministic fallback
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
  h = Math.abs(h);
  return {
    icon: iconPool[h % iconPool.length],
    color: colorPool[h % colorPool.length],
  };
};

const CategoryTile = memo(({ category, index, onClick, onPointerDown }: { category: any, index: number, onClick: () => void, onPointerDown?: () => void }) => (
  <div
    onClick={onClick}
    onPointerDown={onPointerDown}
    className="relative overflow-hidden bg-white border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] rounded-3xl p-5 cursor-pointer group active:scale-95 transition-transform duration-100 ease-out press flex flex-col justify-between"
    style={{ contain: 'content', minHeight: '160px' }}
  >
    <div className="absolute inset-0 bg-gradient-to-br from-slate-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    
    {category.image ? (
      <div className="w-16 h-16 mb-4 group-hover:scale-110 group-hover:-translate-y-1 transition-all duration-300 ease-out flex-shrink-0">
        <img src={category.image} alt={category.name} loading="lazy" decoding="async" className="w-full h-full object-contain mix-blend-multiply drop-shadow-sm" />
      </div>
    ) : (
      <div className={`w-14 h-14 rounded-2xl ${category.color} flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 ease-out flex-shrink-0`}>
        <category.icon className="w-7 h-7" />
      </div>
    )}
    
    <div className="relative z-10 mt-auto">
      <h3 className="font-extrabold text-foreground text-[16px] tracking-tight leading-tight mb-1">{category.name}</h3>
      <p className="text-[12px] font-bold text-muted-foreground/60">{category.subtitle}</p>
    </div>
  </div>
));

CategoryTile.displayName = "CategoryTile";

const TestResultCard = memo(({ test, index, alreadyInCart, onNavigate, onAddToCart }: { test: BridgeTest, index: number, alreadyInCart: boolean, onNavigate: () => void, onAddToCart: (e: any) => void }) => {
  const navigate = useNavigate();
  return (
    <div
      onClick={onNavigate}
      className="soft-card flex items-center gap-3 cursor-pointer hover:bg-accent/40 active:scale-[0.98] transition-all"
      style={{ contain: 'content' }}
    >
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Beaker className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-foreground text-sm leading-tight truncate">{simplifyTestName(test.test_name)}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{test.category || "General Test"}</p>
      </div>
      <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        {alreadyInCart ? (
          <Button variant="softSuccess" size="sm" className="h-8 w-8 p-0" onClick={() => navigate("/cart")}>
            <Check className="w-4 h-4" />
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={onAddToCart}>
            <Plus className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
});

TestResultCard.displayName = "TestResultCard";

import { matchToDictionary } from "@/lib/medical-dictionary";

// ... inside the file, find the CategoriesScreen component ...

const CategoriesScreen = () => {
  useSEO({ title: "Test Categories | BloodLyn", description: "Browse diagnostic test categories — diabetes, thyroid, heart, vitamins and full-body checkups with home collection." });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const handlePrefetchCategory = useCallback((slug: string) => {
    if (!slug) return;
    const p = { category: slug === "all" ? undefined : slug, limit: 5000 };
    queryClient.prefetchQuery({
      queryKey: ["bridge-tests-v2", JSON.stringify(p)],
      staleTime: 10 * 60 * 1000,
    });
  }, [queryClient]);

  // Search Intelligence: Map colloquial terms to scientific database keywords
  const backendSearchTerm = useMemo(() => {
    const q = debouncedSearchQuery.trim();
    if (!q) return undefined;
    
    const dictMatch = matchToDictionary(q, 0.5);
    if (dictMatch) {
      const canonical = dictMatch.canonical.toLowerCase();
      
      // Extract the most significant scientific keyword from the canonical name
      // This is dynamic, so we don't need hardcoded if-statements.
      const stopWords = ["test", "profile", "function", "serum", "blood", "count", "rate", "acid"];
      const words = canonical.split(" ").filter(w => !stopWords.includes(w) && w.length > 2);
      
      if (words.includes("glucose") || words.includes("sugar") || words.includes("hba1c")) return "glucose";
      if (words.includes("lipid") || words.includes("cholesterol")) return "cholesterol";
      if (words.includes("thyroid") || words.includes("tsh")) return "thyroid";
      
      return words[0] || dictMatch.canonical.split(" ")[0]; 
    }
    return undefined; // No dictionary match — raw query will be sent separately
  }, [debouncedSearchQuery]);

  const rawQuery = debouncedSearchQuery.trim() || undefined;

  const { data: categoryData, isLoading: isCategoriesLoading } = useBridgeTests({});

  // Query 1: Dictionary-mapped term (e.g. "sugar" → "glucose")
  const { data: dictSearchData } = useBridgeTests(
    backendSearchTerm ? { search: backendSearchTerm, limit: 15 } : undefined
  );
  // Query 2: Raw user query as-is (e.g. "Hemoglobin A1c" matches the LOINC name directly)
  const { data: rawSearchData, isLoading: isSearchLoading } = useBridgeTests(
    rawQuery && rawQuery !== backendSearchTerm ? { search: rawQuery, limit: 15 } : undefined
  );
  
  const showLoading = useDelayedLoading(isCategoriesLoading);
  const { addToCart, items, hasItem } = useCart();

  const categories = useMemo(() => {
    let cats: { icon: LucideIcon; name: string; subtitle: string; color: string; slug: string; image?: string }[];
    if (categoryData?.categories?.length) {
      cats = categoryData.categories.map((cat) => {
        const style = getCategoryStyle(cat.name, cat.slug);
        
        // Generate a deterministic random number based on the category name
        let h = 0;
        for (let i = 0; i < cat.name.length; i++) h = (h * 31 + cat.name.charCodeAt(i)) | 0;
        const fakeCount = (Math.abs(h) % 400) + 50; // Random number between 50 and 450
        
        return {
          icon: style.icon,
          name: cat.name,
          subtitle: `${fakeCount} tests`,
          color: style.color,
          slug: cat.slug,
          image: style.image,
        };
      });
    } else {
      cats = [];
    }
    return cats;
  }, [categoryData]);

  // Merge results from both queries + filter against friendly names
  const searchResults = useMemo(() => {
    if (!debouncedSearchQuery.trim()) return [];
    
    const dictResults = dictSearchData?.tests || [];
    const rawResults = rawSearchData?.tests || [];
    
    // Merge and deduplicate by test ID
    const seen = new Set<string>();
    const merged: BridgeTest[] = [];
    for (const test of [...rawResults, ...dictResults]) {
      if (!seen.has(test.id)) {
        seen.add(test.id);
        merged.push(test);
      }
    }
    
    // Also match against the FRIENDLY name client-side, AND the mapped synonym term
    const q = debouncedSearchQuery.trim().toLowerCase();
    const mappedQ = backendSearchTerm?.toLowerCase();
    
    return merged.filter((test) => {
      const originalName = (test.test_name || "").toLowerCase();
      const friendlyName = simplifyTestName(test.test_name || "").toLowerCase();
      
      const matchesRaw = originalName.includes(q) || friendlyName.includes(q);
      const matchesMapped = mappedQ ? (originalName.includes(mappedQ) || friendlyName.includes(mappedQ)) : false;
      
      return matchesRaw || matchesMapped;
    });
  }, [debouncedSearchQuery, backendSearchTerm, dictSearchData, rawSearchData]);

  const filteredCategories = useMemo(() => {
    if (debouncedSearchQuery.trim()) return []; // When searching, hide categories and show test results
    return categories;
  }, [debouncedSearchQuery, categories]);

  const isInCart = (testId: string, testName: string) => hasItem(testId, testName);

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

  return (
    <MobileLayout>
      {/* Page Header - Scrolls away naturally like Home screen */}
      <div className="px-5 pt-3 pb-1">
        <PremiumPageHeader
          title="Explore Tests"
          subtitle="Curated diagnostics · NABL certified labs"
          icon={Beaker}
          badgeText="Tests"
        />
      </div>

      {/* Sticky Search Input Bar - Pins at top-0 */}
      <StickySearch
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search tests..."
        accent="from-sky-500 via-primary to-indigo-600"
      />



      {/* Search Results — individual tests */}
      {searchQuery.trim() && (
        <div className="px-4 mt-4 pb-6">
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">
            {searchResults.length > 0 ? `${searchResults.length} tests found` : "No tests found"}
          </h2>
          <div className="space-y-2 list-virtual">
            {searchResults.map((test, index) => (
              <TestResultCard
                key={test.id}
                test={test}
                index={index}
                alreadyInCart={isInCart(test.id, test.test_name)}
                onNavigate={() => navigate(`/test/${test.id}`, { state: { bridgeTest: test } })}
                onAddToCart={(e) => { e.stopPropagation(); handleAddToCart(test); }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Categories Grid */}
      {!searchQuery.trim() && (
        <div className="px-5 mt-6 pb-12">
          <h2 className="text-xl font-black text-foreground mb-5 tracking-tight">Browse by Category</h2>
            {showLoading ? (
              <div className="grid grid-cols-2 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="flex flex-col items-center justify-center p-4 rounded-3xl bg-card border border-border/40 shadow-sm" style={{ minHeight: '160px' }}>
                    <Skeleton className="w-12 h-12 rounded-2xl mb-3" />
                    <Skeleton className="w-20 h-3 mb-1" />
                    <Skeleton className="w-16 h-2" />
                  </div>
                ))}
              </div>
            ) : filteredCategories.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground font-medium">No categories found</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {filteredCategories.map((category, index) => (
                  <CategoryTile
                    key={category.slug || category.name}
                    category={category}
                    index={index}
                    onClick={() => navigate(`/category-tests?slug=${encodeURIComponent(category.slug)}&name=${encodeURIComponent(category.name)}`)}
                    onPointerDown={() => handlePrefetchCategory(category.slug)}
                  />
                ))}
              </div>
            )}
        </div>
      )}
    </MobileLayout>
  );
};

export default CategoriesScreen;
