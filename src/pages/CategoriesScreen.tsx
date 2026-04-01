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
  Lungs,
  type LucideIcon,
} from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import ScreenHeader from "@/components/layout/ScreenHeader";
import { useBridgeTests } from "@/hooks/useBridgeTests";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";

// Large pool of icons so each category gets a unique one
const iconPool: LucideIcon[] = [
  Droplets, Activity, Pill, Sun, Heart, UserCheck, Stethoscope, Baby,
  Brain, Bone, Microscope, Dna, ShieldCheck, Thermometer, Eye, Ear,
  Syringe, Beaker, TestTubes, Scan, HeartPulse, Lungs,
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
  const [searchQuery, setSearchQuery] = useState("");

  const categories = useMemo(() => {
    let cats: { icon: LucideIcon; name: string; tests: number; color: string; slug: string }[];
    if (bridgeData?.categories?.length) {
      const testsByCategory: Record<string, number> = {};
      bridgeData.tests?.forEach((t) => {
        testsByCategory[t.category] = (testsByCategory[t.category] || 0) + 1;
      });
      cats = bridgeData.categories.map((cat, _idx) => {
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
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      cats = cats.filter((c) => c.name.toLowerCase().includes(q));
    }
    return cats;
  }, [bridgeData, searchQuery]);

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
            placeholder="Search categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-muted border-0 rounded-xl h-11"
          />
        </div>
      </motion.div>

      {/* Categories Grid */}
      <div className="px-4 mt-6 pb-6">
        <h2 className="text-lg font-bold text-foreground mb-4">Browse by Category</h2>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No categories found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {categories.map((category, index) => (
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
    </MobileLayout>
  );
};

export default CategoriesScreen;
