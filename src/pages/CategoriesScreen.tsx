import { memo, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
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

// Hand-picked icons and colors for specific known categories
const CATEGORY_MAP: Record<string, { icon: LucideIcon; color: string }> = {
  "cardiac": { icon: HeartPulse, color: "bg-rose-100 text-rose-600" },
  "diabetes": { icon: Activity, color: "bg-sky-100 text-sky-600" },
  "kidney": { icon: Droplets, color: "bg-amber-100 text-amber-600" },
  "liver": { icon: Beaker, color: "bg-emerald-100 text-emerald-600" },
  "thyroid": { icon: Activity, color: "bg-purple-100 text-purple-600" },
  "fever": { icon: Thermometer, color: "bg-orange-100 text-orange-600" },
  "full body": { icon: Scan, color: "bg-indigo-100 text-indigo-600" },
  "vitamin": { icon: Pill, color: "bg-yellow-100 text-yellow-600" },
  "bone": { icon: Bone, color: "bg-slate-100 text-slate-700" },
  "pregnancy": { icon: Baby, color: "bg-pink-100 text-pink-600" },
  "neurology": { icon: Brain, color: "bg-cyan-100 text-cyan-600" },
  "infection": { icon: ShieldCheck, color: "bg-red-100 text-red-600" },
  "immunity": { icon: ShieldCheck, color: "bg-teal-100 text-teal-600" },
  "blood": { icon: Syringe, color: "bg-red-50 text-red-500" },
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

const CategoryTile = memo(({ category, index, onClick }: { category: any, index: number, onClick: () => void }) => (
  <motion.div
    whileTap={{ scale: 0.95 }}
    initial={{ opacity: 0, y: 15 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.03, type: "spring", stiffness: 300, damping: 24 }}
    onClick={onClick}
    className="relative overflow-hidden bg-white border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] rounded-3xl p-5 cursor-pointer group"
    style={{ contain: 'content' }}
  >
    <div className="absolute inset-0 bg-gradient-to-br from-slate-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    <div className={`w-14 h-14 rounded-2xl ${category.color} flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 ease-out`}>
      <category.icon className="w-7 h-7" />
    </div>
    <h3 className="font-extrabold text-foreground text-[16px] tracking-tight leading-tight mb-1 relative z-10">{category.name}</h3>
    <p className="text-[12px] font-bold text-muted-foreground/60 relative z-10">{category.tests} {category.tests === 1 ? 'test' : 'tests'}</p>
  </motion.div>
));

CategoryTile.displayName = "CategoryTile";

const TestResultCard = memo(({ test, index, alreadyInCart, onNavigate, onAddToCart }: { test: BridgeTest, index: number, alreadyInCart: boolean, onNavigate: () => void, onAddToCart: (e: any) => void }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.03 }}
    onClick={onNavigate}
    className="soft-card flex items-center gap-3 cursor-pointer hover:bg-accent/40 active:scale-[0.98] transition-all"
    style={{ contain: 'content' }}
  >
    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
      <Beaker className="w-5 h-5 text-primary" />
    </div>
    <div className="flex-1 min-w-0">
      <h3 className="font-semibold text-foreground text-sm leading-tight truncate">{test.test_name}</h3>
      <p className="text-xs text-muted-foreground mt-0.5">{test.category || "General Test"}</p>
    </div>
    <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
      {alreadyInCart ? (
        <Button variant="softSuccess" size="sm" className="h-8 w-8 p-0" onClick={() => window.location.href = "/cart"}>
          <Plus className="w-4 h-4" />
        </Button>
      ) : (
        <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={onAddToCart}>
          <Plus className="w-4 h-4" />
        </Button>
      )}
    </div>
  </motion.div>
));

TestResultCard.displayName = "TestResultCard";

const CategoriesScreen = () => {
  useSEO({ title: "Test Categories | BloodLyn", description: "Browse diagnostic test categories — diabetes, thyroid, heart, vitamins and full-body checkups with home collection." });
  const navigate = useNavigate();
  const { data: bridgeData, isLoading } = useBridgeTests();
  const { addToCart, items, hasItem } = useCart();
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const categories = useMemo(() => {
    let cats: { icon: LucideIcon; name: string; tests: number; color: string; slug: string }[];
    if (bridgeData?.categories?.length) {
      const testsByCategory: Record<string, number> = {};
      bridgeData.tests?.forEach((t) => {
        testsByCategory[t.category] = (testsByCategory[t.category] || 0) + 1;
      });
      cats = bridgeData.categories.map((cat) => {
        const style = getCategoryStyle(cat.name, cat.slug);
        return {
          icon: style.icon,
          name: cat.name,
          tests: testsByCategory[cat.slug] || 0,
          color: style.color,
          slug: cat.slug,
        };
      });

      // Add "All Tests" tile at the beginning
      cats.unshift({
        icon: TestTubes,
        name: "All Tests",
        tests: bridgeData.tests?.length || 0,
        color: "bg-primary/10 text-primary",
        slug: "all",
      });
    } else {
      cats = [];
    }
    return cats;
  }, [bridgeData]);

  // Search results: search through individual tests, not just categories
  const searchResults = useMemo(() => {
    const q = debouncedSearchQuery.trim().toLowerCase();
    if (!q) return [];

    const results: BridgeTest[] = [];
    if (bridgeData?.tests?.length) {
      bridgeData.tests.forEach((t) => {
        if (t.test_name.toLowerCase().includes(q)) {
          results.push(t);
        }
      });
    }
    return results.slice(0, 10);
  }, [debouncedSearchQuery, bridgeData]);

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
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
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
