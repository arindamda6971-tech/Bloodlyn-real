import { memo, useMemo, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Loader2, Sparkles, Beaker, Plus, Check } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import StickySearch from "@/components/ui/StickySearch";
import PremiumPageHeader from "@/components/layout/PremiumPageHeader";
import { categoryTestsQueryOptions, useBridgeTests, type BridgeTest } from "@/hooks/useBridgeTests";
import { useSmartTestSearch } from "@/hooks/useSmartTestSearch";
import { searchHint } from "@/utils/search-intelligence";
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

// Category art: Microsoft Fluent Emoji 3D (MIT, see public/icons/3d/LICENSE-fluent-emoji.txt),
// the same set as Home's "Shop by health concern", bundled as small WebP files.
// `hint` says in plain words what's inside (patients don't know "Clinical
// Chemistry"); `rank` puts everyday categories before specialist ones.
interface CategoryArt {
  icon: string;
  hint: string;
  tint: string;
  rank: number;
}

const CATEGORY_ART: Record<string, CategoryArt> = {
  "clinical-chemistry": { icon: "test-tube", hint: "Sugar, kidney, cholesterol", tint: "bg-sky-50", rank: 1 },
  "hematology": { icon: "drop-of-blood", hint: "CBC, platelets, anaemia", tint: "bg-rose-50", rank: 2 },
  "hormones-endocrinology": { icon: "butterfly", hint: "Thyroid, fertility, insulin", tint: "bg-violet-50", rank: 3 },
  "vitamins-nutrition": { icon: "carrot", hint: "Vitamins & minerals", tint: "bg-orange-50", rank: 4 },
  "cardiac-markers": { icon: "anatomical-heart", hint: "Troponin, BNP, heart risk", tint: "bg-red-50", rank: 5 },
  "infectious-disease": { icon: "microbe", hint: "Hepatitis, HIV, viruses", tint: "bg-lime-50", rank: 6 },
  "urine-stool-body-fluids": { icon: "droplet", hint: "Urine, stool & fluids", tint: "bg-yellow-50", rank: 7 },
  "allergy": { icon: "sneezing-face", hint: "Food, dust & pet allergies", tint: "bg-amber-50", rank: 8 },
  "serology-immunology": { icon: "shield", hint: "Antibodies & immunity", tint: "bg-emerald-50", rank: 9 },
  "tumor-markers": { icon: "reminder-ribbon", hint: "Cancer screening", tint: "bg-pink-50", rank: 10 },
  "coagulation": { icon: "adhesive-bandage", hint: "Blood clotting", tint: "bg-orange-50", rank: 11 },
  "microbiology": { icon: "petri-dish", hint: "Cultures, TB, fungal", tint: "bg-teal-50", rank: 12 },
  "toxicology-drug-testing": { icon: "pill", hint: "Alcohol & heavy metals", tint: "bg-fuchsia-50", rank: 13 },
  "cytology": { icon: "microscope", hint: "Pap smear, FNAC", tint: "bg-indigo-50", rank: 14 },
  "histopathology": { icon: "magnifying-glass", hint: "Biopsy & tissue", tint: "bg-stone-100", rank: 15 },
  "molecular-diagnostics": { icon: "alembic", hint: "PCR & DNA tests", tint: "bg-cyan-50", rank: 16 },
  "genetics": { icon: "dna", hint: "Chromosomes & prenatal", tint: "bg-blue-50", rank: 17 },
  "specialized": { icon: "stethoscope", hint: "Advanced & rare tests", tint: "bg-slate-100", rank: 18 },
};

// Categories added later in the admin panel: pick art by keyword, else a neutral test tube.
const ART_BY_KEYWORD: [RegExp, string][] = [
  [/heart|cardi/, "anatomical-heart"], [/blood|hemat|haemat/, "drop-of-blood"], [/thyroid|hormon/, "butterfly"],
  [/vitamin|nutri/, "carrot"], [/infect|virus|viral/, "microbe"], [/urine|stool|fluid/, "droplet"],
  [/allerg/, "sneezing-face"], [/immun|serolog/, "shield"], [/cancer|tumou?r|onco/, "reminder-ribbon"],
  [/bone|ortho/, "bone"], [/lung|respir/, "lungs"], [/gene|dna|molecul/, "dna"], [/fever/, "thermometer"],
];

const getCategoryArt = (name: string, slug: string): CategoryArt => {
  const known = CATEGORY_ART[slug];
  if (known) return known;
  const key = `${name} ${slug}`.toLowerCase();
  const icon = ART_BY_KEYWORD.find(([re]) => re.test(key))?.[1] ?? "test-tube";
  return { icon, hint: "", tint: "bg-slate-50", rank: 100 };
};

interface CategoryTileData extends CategoryArt {
  name: string;
  slug: string;
}

const CategoryTile = memo(({ category, onClick, onPointerDown }: { category: CategoryTileData, onClick: () => void, onPointerDown?: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    onPointerDown={onPointerDown}
    className="flex flex-col items-center text-center rounded-2xl bg-white border border-slate-100 shadow-[0_4px_16px_rgb(0,0,0,0.04)] px-1.5 pt-3.5 pb-3 active:scale-95 transition-transform duration-100 ease-out"
    style={{ contain: "content" }}
  >
    <span className={`w-14 h-14 rounded-full ${category.tint} ring-1 ring-black/[0.04] flex items-center justify-center shrink-0`}>
      <img
        src={`/icons/3d/${category.icon}.webp`}
        alt=""
        width={36}
        height={36}
        loading="lazy"
        decoding="async"
        draggable={false}
        className="w-9 h-9 object-contain"
      />
    </span>
    <span className="mt-2 text-[12.5px] font-bold text-foreground leading-tight line-clamp-2">{category.name}</span>
    {category.hint && (
      <span className="mt-0.5 text-[10.5px] font-medium text-muted-foreground leading-snug line-clamp-2">{category.hint}</span>
    )}
  </button>
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

const CategoriesScreen = () => {
  useSEO({ title: "Test Categories | BloodLyn", description: "Browse diagnostic test categories — diabetes, thyroid, heart, vitamins and full-body checkups with home collection." });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const handlePrefetchCategory = useCallback((slug: string) => {
    if (!slug) return;
    // Warm the first page of the category on touch, so it opens instantly.
    queryClient.prefetchInfiniteQuery(categoryTestsQueryOptions(slug));
  }, [queryClient]);

  const { data: categoryData, isLoading: isCategoriesLoading } = useBridgeTests({});

  // Intent-aware search: "sugar" → glucose tests, "liver function test" → LFT + SGPT…
  const { results: searchResults, understanding, isSearching } = useSmartTestSearch(debouncedSearchQuery, { limit: 40 });
  const searchHintText = searchHint(understanding);
  const searchPending = isSearching || searchQuery.trim() !== debouncedSearchQuery.trim();

  const showLoading = useDelayedLoading(isCategoriesLoading);
  const { addToCart, items, hasItem } = useCart();

  // Categories come from the admin panel; we only add art and order them.
  const categories = useMemo<CategoryTileData[]>(() => {
    return (categoryData?.categories ?? [])
      .map((cat) => ({ ...getCategoryArt(cat.name, cat.slug), name: cat.name, slug: cat.slug }))
      .sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name));
  }, [categoryData]);

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
          <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            {searchResults.length > 0 ? (
              `${searchResults.length} tests found`
            ) : searchPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Searching tests…</>
            ) : (
              "No tests found"
            )}
          </h2>
          {searchHintText && searchResults.length > 0 && (
            <p className="-mt-2 mb-3 flex items-center gap-1.5 text-[11px] font-semibold text-primary">
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{searchHintText}</span>
            </p>
          )}
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
        <div className="px-4 mt-5 pb-12">
          <h2 className="text-[19px] font-extrabold text-foreground mb-4 tracking-tight px-1">Browse by Category</h2>
            {showLoading ? (
              <div className="grid grid-cols-3 gap-2.5">
                {Array.from({ length: 9 }, (_, i) => (
                  <div key={i} className="flex flex-col items-center rounded-2xl bg-card border border-border/40 px-2 pt-3.5 pb-3">
                    <Skeleton className="w-14 h-14 rounded-full mb-2" />
                    <Skeleton className="w-16 h-3 mb-1" />
                    <Skeleton className="w-12 h-2" />
                  </div>
                ))}
              </div>
            ) : filteredCategories.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground font-medium">No categories found</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2.5">
                {filteredCategories.map((category) => (
                  <CategoryTile
                    key={category.slug || category.name}
                    category={category}
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
