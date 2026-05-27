import { useEffect, useState, useCallback, useMemo } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Building2, HeartPulse, ChevronRight, Package, Sparkles, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MobileLayout from "@/components/layout/MobileLayout";
<<<<<<< HEAD
import ScreenHeader from "@/components/layout/ScreenHeader";
import StickySearch from "@/components/ui/StickySearch";
=======
>>>>>>> d623537 (feat: Comprehensive Futuristic UI overhaul and Squeezable Header system)
import { supabase } from "@/integrations/supabase/client";
import { useSEO } from "@/hooks/useSEO";

const PackagesScreen = () => {
  useSEO({ title: "Health Packages | BloodLyn", description: "Curated full-body health checkup packages at the best prices, delivered at home." });
  const navigate = useNavigate();
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  // Header Squeeze Animation Logic
  const { scrollY } = useScroll();
  const headerHeight = useTransform(scrollY, [0, 60], [100, 70]);
  const titleOpacity = useTransform(scrollY, [0, 30], [1, 0.5]);
  const titleScale = useTransform(scrollY, [0, 30], [1, 0.9]);

  const fetchPackages = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await supabase
        .from("test_packages")
        .select(`
          id, name, tests_count, price, original_price, discount_percent, icon, color,
          diagnostic_centers!diagnostic_center_id (id, name, logo_url)
        `)
        .eq("is_active", true)
        .order("is_popular", { ascending: false });
      if (data) {
        setPackages(data.map((pkg: any) => ({
          id: pkg.id,
          name: pkg.name,
          tests_count: pkg.tests_count || 0,
          price: pkg.price,
          original_price: pkg.original_price || undefined,
          discount_percent: pkg.discount_percent || undefined,
          icon: pkg.icon || undefined,
          color: pkg.color || undefined,
          lab_id: pkg.diagnostic_centers?.id || undefined,
          lab_name: pkg.diagnostic_centers?.name || undefined,
          lab_logo: pkg.diagnostic_centers?.logo_url || undefined,
        })));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  // Build unique labs map with counts and details
  const labs = useMemo(() => {
    const map = new Map<string, { 
      id?: string; 
      name?: string; 
      logo?: string; 
      count: number;
      avgPrice: number;
      maxDiscount: number;
    }>();
    packages.forEach((p) => {
      const key = p.lab_id || p.lab_name || p.id;
      if (!map.has(key)) {
        map.set(key, { 
          id: p.lab_id, 
          name: p.lab_name || `Lab ${key}`, 
          logo: p.lab_logo, 
          count: 1,
          avgPrice: p.price,
          maxDiscount: p.discount_percent || 0,
        });
      } else {
        const entry = map.get(key)!;
        entry.count += 1;
        entry.avgPrice = (entry.avgPrice + p.price) / 2;
        entry.maxDiscount = Math.max(entry.maxDiscount, p.discount_percent || 0);
        map.set(key, entry);
      }
    });
    return Array.from(map.values())
      .filter((l) => !query.trim() || (l.name || "").toLowerCase().includes(query.trim().toLowerCase()))
      .sort((a, b) => b.count - a.count);
  }, [packages, query]);

  return (
    <MobileLayout>
<<<<<<< HEAD
      <ScreenHeader title="Health Packages" />
      <StickySearch value={query} onChange={setQuery} placeholder="Search diagnostic labs..." />
=======
      <motion.header
        className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40 px-6 overflow-hidden flex items-center gap-4"
        style={{
          height: headerHeight,
          paddingTop: "calc(env(safe-area-inset-top, 24px) + 8px)"
        }}
      >
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-white/50 flex items-center justify-center border border-white/20">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <motion.h1
          style={{ opacity: titleOpacity, scale: titleScale, originX: 0 }}
          className="text-lg font-black text-foreground tracking-tight"
        >
          Health Packages
        </motion.h1>
      </motion.header>
>>>>>>> d623537 (feat: Comprehensive Futuristic UI overhaul and Squeezable Header system)

      <div className="pb-6">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-primary/10 via-accent/5 to-background px-4 py-8 relative overflow-hidden"
        >
          {/* Background decorative elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-success/5 rounded-full -ml-12 -mb-12" />

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                <Package className="w-5 h-5 text-primary" />
              </div>
              <span className="text-xs font-bold text-primary uppercase tracking-wide">Featured Packages</span>
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2 leading-tight">
              Explore Health Packages
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Choose from top-rated diagnostic labs and get comprehensive health checkups
            </p>
          </div>
        </motion.div>

        <div className="px-4 py-6 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
            </div>
          ) : labs.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-12"
            >
              <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <HeartPulse className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground font-medium">No packages available</p>
              <p className="text-xs text-muted-foreground mt-1">Check back soon for new packages</p>
            </motion.div>
          ) : (
            <>
              {/* Quick Stats */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="grid grid-cols-2 gap-3 mb-4"
              >
                <div className="bg-primary/10 rounded-xl p-3 text-center border border-primary/20">
                  <p className="text-2xl font-bold text-primary">{labs.length}</p>
                  <p className="text-xs text-muted-foreground font-medium">Top Labs</p>
                </div>
                <div className="bg-success/10 rounded-xl p-3 text-center border border-success/20">
                  <p className="text-2xl font-bold text-success">{packages.length}</p>
                  <p className="text-xs text-muted-foreground font-medium">Packages</p>
                </div>
              </motion.div>

              {/* Labs List */}
              <div className="space-y-3">
                {labs.map((lab, index) => (
                  <motion.button
                    key={lab.id || `${lab.name}-${index}`}
                    type="button"
                    onClick={() => {
                      if (lab.id) navigate(`/lab/${lab.id}`);
                      else navigate('/partner-labs');
                    }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + index * 0.05 }}
                    className="w-full text-left group"
                  >
                    <div className="bg-white dark:bg-secondary/30 rounded-xl p-4 border border-border/40 hover:border-primary/40 hover:shadow-md transition-all duration-200 overflow-hidden relative"
                    >
                      {/* Background gradient on hover */}
                      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

                      <div className="relative z-10 flex items-center gap-3">
                        {/* Logo/Avatar */}
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0 group-hover:from-primary/30 group-hover:to-primary/20 transition-colors">
                          <Building2 className="w-7 h-7 text-primary" />
                        </div>

                        {/* Lab Info */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors">
                            {lab.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 rounded-full">
                              <Package className="w-3 h-3 text-primary" />
                              <span className="text-xs font-semibold text-primary">
                                {lab.count} {lab.count === 1 ? 'package' : 'packages'}
                              </span>
                            </span>
                            {lab.maxDiscount > 0 && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-destructive/10 rounded-full">
                                <Sparkles className="w-3 h-3 text-destructive" />
                                <span className="text-xs font-semibold text-destructive">
                                  Up to {lab.maxDiscount}% off
                                </span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Arrow */}
                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors group-hover:translate-x-1 duration-200 flex-shrink-0" />
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>

              {/* Footer Info */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-8 p-4 rounded-xl bg-accent/30 border border-accent/40"
              >
                <p className="text-xs text-muted-foreground text-center leading-relaxed">
                  All packages include home sample collection, NABL certified tests, and same-day or next-day reports.
                </p>
              </motion.div>
            </>
          )}
        </div>
      </div>
    </MobileLayout>
  );
};

export default PackagesScreen;
