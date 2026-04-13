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
import ScreenHeader from "@/components/layout/ScreenHeader";
import DoctorAdCarousel from "@/components/categories/DoctorAdCarousel";
import { useBridgeTests, type BridgeTest } from "@/hooks/useBridgeTests";
import { useCart } from "@/contexts/CartContext";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// Large pool of icons so each category gets a unique one
const iconPool: LucideIcon[] = [
  Droplets, Activity, Pill, Sun, Heart, UserCheck, Stethoscope, Baby,
  Brain, Bone, Microscope, Dna, ShieldCheck, Thermometer, Eye, Ear,
  Syringe, Beaker, TestTubes, Scan, HeartPulse, Wind,
];

const colorPool: string[] = [
  "bg-destructive/10 text-destructive",
  "bg-success/10 text-success",
  "bg-primary/10 text-primary",
  "bg-warning/10 text-warning",
  "bg-pink-100 text-pink-600",
  "bg-secondary/10 text-secondary",
  "bg-purple-100 text-purple-600",
  "bg-indigo-100 text-indigo-600",
  "bg-orange-100 text-orange-600",
  "bg-teal-100 text-teal-600",
  "bg-cyan-100 text-cyan-600",
  "bg-emerald-100 text-emerald-600",
];

// Simple hash to deterministically pick icon/color by name
const hashStr = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};

const CategoriesScreen = () => {
  const navigate = useNavigate();
  const { data: bridgeData, isLoading } = useBridgeTests();
  const { addToCart, items } = useCart();
  const [searchQuery, setSearchQuery] = useState("");

  const categories = useMemo(() => {
    let cats: { icon: LucideIcon; name: string; tests: number; color: string; slug: string }[];
    if (bridgeData?.categories?.length) {
      const testsByCategory: Record<string, number> = {};
      bridgeData.tests?.forEach((t) => {
        testsByCategory[t.category] = (testsByCategory[t.category] || 0) + 1;
      });
      cats = bridgeData.categories.map((cat) => {
        const h = hashStr(cat.slug || cat.name);
        return {
          icon: iconPool[h % iconPool.length],
          name: cat.name,
          tests: testsByCategory[cat.slug] || 0,
          color: colorPool[h % colorPool.length],
          slug: cat.slug,
        };
      });
    } else {
      cats = [];
    }
    return cats;
  }, [bridgeData]);

  // Search results: search through individual tests, not just categories
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
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
  }, [searchQuery, bridgeData]);

  const filteredCategories = useMemo(() => {
    if (searchQuery.trim()) return []; // When searching, hide categories and show test results
    return categories;
  }, [searchQuery, categories]);

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

  return (
    <MobileLayout>
      <ScreenHeader title="Test Categories" showBack={false} />

      {/* Search Box */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-4 mt-4"
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search tests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-muted border-0 rounded-xl h-11"
          />
        </div>
      </motion.div>

      {/* Search Results — individual tests */}
      {searchQuery.trim() && (
        <div className="px-4 mt-4 pb-6">
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">
            {searchResults.length > 0 ? `${searchResults.length} tests found` : "No tests found"}
          </h2>
          <div className="space-y-2">
            {searchResults.map((test, index) => {
              const alreadyInCart = isInCart(test.id);
              return (
                <motion.div
                  key={test.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="soft-card flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Beaker className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground text-sm">{test.test_name}</h3>
                    <p className="text-xs text-muted-foreground">{test.category}</p>
                  </div>
                  <div className="flex-shrink-0">
                    {alreadyInCart ? (
                      <Button variant="softSuccess" size="sm" className="h-8 w-8 p-0" onClick={() => navigate("/cart")}>
                        <Plus className="w-4 h-4" />
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => handleAddToCart(test)}>
                        <Plus className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Categories Grid */}
      {!searchQuery.trim() && (
        <div className="px-4 mt-6 pb-6">
          <h2 className="text-lg font-bold text-foreground mb-4">Browse by Category</h2>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No categories found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filteredCategories.map((category, index) => (
                <motion.div
                  key={category.slug || category.name}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => navigate(`/category-tests?slug=${encodeURIComponent(category.slug)}&name=${encodeURIComponent(category.name)}`)}
                  className="category-card"
                >
                  <div className={`w-12 h-12 rounded-2xl ${category.color} flex items-center justify-center mb-3`}>
                    <category.icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-semibold text-foreground text-sm">{category.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{category.tests} tests</p>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}
    </MobileLayout>
  );
};

export default CategoriesScreen;