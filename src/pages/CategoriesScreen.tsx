import { useNavigate } from "react-router-dom";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import {
  Droplets, Activity, Pill, Sun, Heart, UserCheck, Stethoscope, Baby,
  Brain, Bone, Search, Loader2, Microscope, Dna, ShieldCheck, Thermometer,
  Eye, Ear, Syringe, Beaker, TestTubes, Scan, HeartPulse, Wind, Plus, ArrowLeft, X,
  type LucideIcon,
} from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
<<<<<<< HEAD
import ScreenHeader from "@/components/layout/ScreenHeader";
import StickySearch from "@/components/ui/StickySearch";
=======
>>>>>>> d623537 (feat: Comprehensive Futuristic UI overhaul and Squeezable Header system)
import DoctorAdCarousel from "@/components/categories/DoctorAdCarousel";
import { useBridgeTests, type BridgeTest } from "@/hooks/useBridgeTests";
import { useCart } from "@/contexts/CartContext";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useSEO } from "@/hooks/useSEO";

const iconPool: LucideIcon[] = [
  Droplets, Activity, Pill, Sun, Heart, UserCheck, Stethoscope, Baby,
  Brain, Bone, Microscope, Dna, ShieldCheck, Thermometer, Eye, Ear,
  Syringe, Beaker, TestTubes, Scan, HeartPulse, Wind,
];

const colorPool: string[] = [
  "bg-destructive/10 text-destructive", "bg-success/10 text-success",
  "bg-primary/10 text-primary", "bg-warning/10 text-warning",
  "bg-pink-100 text-pink-600", "bg-secondary/10 text-secondary",
  "bg-purple-100 text-purple-600", "bg-indigo-100 text-indigo-600",
  "bg-orange-100 text-orange-600", "bg-teal-100 text-teal-600",
  "bg-cyan-100 text-cyan-600", "bg-emerald-100 text-emerald-600",
];

const hashStr = (s: string) => {
  let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};

const CategoriesScreen = () => {
  useSEO({ title: "Test Categories | BloodLyn", description: "Browse diagnostic test categories with home collection." });
  const navigate = useNavigate();
  const { data: bridgeData, isLoading } = useBridgeTests();
  const { addToCart, items } = useCart();
  const [searchQuery, setSearchQuery] = useState("");

  const { scrollY } = useScroll();
  const headerHeight = useTransform(scrollY, [0, 80], [130, 70]);
  const titleOpacity = useTransform(scrollY, [0, 40], [1, 0]);
  const titleScale = useTransform(scrollY, [0, 40], [1, 0.8]);
  const searchY = useTransform(scrollY, [0, 80], [0, -45]);

  const categories = useMemo(() => {
    if (!bridgeData?.categories) return [];
    const testsByCategory: Record<string, number> = {};
    bridgeData.tests?.forEach((t) => { testsByCategory[t.category] = (testsByCategory[t.category] || 0) + 1; });
    return bridgeData.categories.map((cat) => {
      const h = hashStr(cat.slug || cat.name);
      return {
        icon: iconPool[h % iconPool.length], name: cat.name, tests: testsByCategory[cat.slug] || 0,
        color: colorPool[h % colorPool.length], slug: cat.slug,
      };
    });
  }, [bridgeData]);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q || !bridgeData?.tests) return [];
    return bridgeData.tests.filter((t) => t.test_name.toLowerCase().includes(q)).slice(0, 10);
  }, [searchQuery, bridgeData]);

  const isInCart = (testId: string) => items.some((item) => item.id === testId);

  return (
    <MobileLayout>
<<<<<<< HEAD
      <ScreenHeader title="Test Categories" showBack={false} />

      <StickySearch
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search tests..."
      />
=======
      <motion.header
        className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40 px-6 overflow-hidden"
        style={{ height: headerHeight, paddingTop: "calc(env(safe-area-inset-top, 24px) + 12px)" }}
      >
        <motion.div style={{ opacity: titleOpacity, scale: titleScale, originX: 0 }} className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-white/50 flex items-center justify-center border border-white/20"><ArrowLeft className="w-5 h-5 text-foreground" /></button>
          <h1 className="text-[20px] font-black text-foreground tracking-tight">Test Categories</h1>
        </motion.div>
        <motion.div style={{ y: searchY }} className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
          <input type="text" placeholder="Search tests..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-white/50 backdrop-blur-md rounded-2xl py-3.5 pl-11 pr-10 text-sm font-medium border border-white/20 shadow-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
          {searchQuery && <button onClick={() => setSearchQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2 z-10"><X className="w-4 h-4 text-muted-foreground" /></button>}
        </motion.div>
      </motion.header>
>>>>>>> d623537 (feat: Comprehensive Futuristic UI overhaul and Squeezable Header system)

      <div className="px-6 mt-4 pb-24">
        {searchQuery.trim() ? (
          <div className="space-y-3">
            {searchResults.map((test, index) => (
              <motion.div key={test.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }} className="soft-card flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0"><Beaker className="w-5 h-5 text-primary" /></div>
                <div className="flex-1 min-w-0"><h3 className="font-semibold text-foreground text-sm truncate">{test.test_name}</h3><p className="text-xs text-muted-foreground">{test.category}</p></div>
                <Button variant={isInCart(test.id) ? "softSuccess" : "outline"} size="sm" className="h-8 w-8 p-0" onClick={() => isInCart(test.id) ? navigate("/cart") : addToCart({ id: test.id, name: test.test_name, price: test.price || 0 })}>
                  <Plus className="w-4 h-4" />
                </Button>
              </motion.div>
            ))}
          </div>
        ) : (
          <>
            <DoctorAdCarousel categories={categories.map(c => ({ name: c.name, slug: c.slug, tests: c.tests }))} />
            <h2 className="text-lg font-black text-foreground mt-8 mb-4">Browse by Category</h2>
            {isLoading ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div> : (
              <div className="grid grid-cols-2 gap-4">
                {categories.map((category, index) => (
                  <motion.div key={category.slug} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: index * 0.05 }} onClick={() => navigate(`/category-tests?slug=${encodeURIComponent(category.slug)}&name=${encodeURIComponent(category.name)}`)} className="soft-card border border-white/50 bg-white/60 backdrop-blur-md p-5 shadow-sm text-center flex flex-col items-center">
                    <div className={`w-14 h-14 rounded-2xl ${category.color} flex items-center justify-center mb-4 border border-white`}><category.icon className="w-7 h-7" /></div>
                    <h3 className="font-black text-foreground text-sm leading-tight line-clamp-1">{category.name}</h3>
                    <p className="text-[10px] font-bold text-muted-foreground mt-1 uppercase tracking-widest opacity-60">{category.tests} tests</p>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </MobileLayout>
  );
};

export default CategoriesScreen;
