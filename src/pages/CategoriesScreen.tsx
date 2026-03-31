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
} from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import ScreenHeader from "@/components/layout/ScreenHeader";
import { useBridgeTests } from "@/hooks/useBridgeTests";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";

const iconMap: Record<string, any> = {
  blood: Droplets,
  liver: Activity,
  thyroid: Pill,
  vitamin: Sun,
  women: Heart,
  men: UserCheck,
  full_body: Stethoscope,
  pregnancy: Baby,
  hormones: Brain,
  bone: Bone,
};

const colorMap: Record<string, string> = {
  blood: "bg-destructive/10 text-destructive",
  liver: "bg-success/10 text-success",
  thyroid: "bg-primary/10 text-primary",
  vitamin: "bg-warning/10 text-warning",
  women: "bg-pink-100 text-pink-600",
  men: "bg-secondary/10 text-secondary",
  full_body: "bg-primary/10 text-primary",
  pregnancy: "bg-purple-100 text-purple-600",
  hormones: "bg-indigo-100 text-indigo-600",
  bone: "bg-orange-100 text-orange-600",
};

const fallbackCategories = [
  { icon: Droplets, name: "Blood Tests", tests: 45, color: "bg-destructive/10 text-destructive", slug: "" },
  { icon: Activity, name: "Liver Function", tests: 12, color: "bg-success/10 text-success", slug: "" },
  { icon: Pill, name: "Thyroid", tests: 8, color: "bg-primary/10 text-primary", slug: "" },
  { icon: Sun, name: "Vitamin", tests: 15, color: "bg-warning/10 text-warning", slug: "" },
  { icon: Heart, name: "Women's Health", tests: 28, color: "bg-pink-100 text-pink-600", slug: "" },
  { icon: UserCheck, name: "Men's Health", tests: 22, color: "bg-secondary/10 text-secondary", slug: "" },
  { icon: Stethoscope, name: "Full Body", tests: 35, color: "bg-primary/10 text-primary", slug: "" },
  { icon: Baby, name: "Pregnancy", tests: 18, color: "bg-purple-100 text-purple-600", slug: "" },
  { icon: Brain, name: "Hormones", tests: 20, color: "bg-indigo-100 text-indigo-600", slug: "" },
  { icon: Bone, name: "Bone & Joint", tests: 14, color: "bg-orange-100 text-orange-600", slug: "" },
];

const CategoriesScreen = () => {
  const navigate = useNavigate();
  const { data: bridgeData, isLoading } = useBridgeTests();

  const categories = useMemo(() => {
    if (bridgeData?.categories?.length) {
      const testsByCategory: Record<string, number> = {};
      bridgeData.tests?.forEach((t) => {
        testsByCategory[t.category] = (testsByCategory[t.category] || 0) + 1;
      });
      return bridgeData.categories.map((cat) => ({
        icon: iconMap[cat.slug] || Stethoscope,
        name: cat.name,
        tests: testsByCategory[cat.slug] || 0,
        color: colorMap[cat.slug] || "bg-primary/10 text-primary",
        slug: cat.slug,
      }));
    }
    return fallbackCategories;
  }, [bridgeData]);

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
            placeholder="Search tests, packages..."
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
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {categories.map((category, index) => (
              <motion.div
                key={category.name}
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
