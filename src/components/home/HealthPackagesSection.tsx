import React, { useMemo, memo } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Building2, Package, Sparkles, ChevronRight, HeartPulse } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import OptimizedImage from "@/components/ui/OptimizedImage";

type PkgRow = {
  id: string;
  name: string;
  price: number;
  discount_percent: number | null;
  is_active: boolean | null;
  diagnostic_center_id: string | null;
  diagnostic_centers?: { id: string; name: string; logo_url: string | null } | null;
};

type LabGroup = {
  id: string;
  name: string;
  logo?: string | null;
  count: number;
  fromPrice: number;
  maxDiscount: number;
};

const LabPackageCard = memo(({ lab, idx, onClick }: { lab: LabGroup, idx: number, onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className="group relative overflow-hidden text-left bg-card border border-border/50 rounded-3xl p-4 shadow-sm active:opacity-95 transition-opacity w-full"
    style={{ contain: 'content' }}
  >
    <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, hsl(var(--primary) / 0.08) 0%, transparent 70%)" }} />
    <div className="relative z-10 flex items-center gap-3">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0 overflow-hidden">
        {lab.logo ? (
          <OptimizedImage
            src={lab.logo}
            alt={lab.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <Building2 className="w-7 h-7 text-primary" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-extrabold text-foreground truncate leading-tight">
          {lab.name}
        </p>
        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10">
            <Package className="w-3 h-3 text-primary" />
            <span className="text-[10px] font-black text-primary">
              {lab.count} {lab.count === 1 ? "package" : "packages"}
            </span>
          </span>
          {lab.maxDiscount > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-destructive/10">
              <Sparkles className="w-3 h-3 text-destructive" />
              <span className="text-[10px] font-black text-destructive">
                Up to {lab.maxDiscount}% off
              </span>
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">
          From
        </span>
        <span className="text-base font-black text-foreground leading-none">
          ₹{Math.round(lab.fromPrice)}
        </span>
        <ChevronRight className="w-4 h-4 text-muted-foreground mt-0.5 group-active:translate-x-0.5 transition-transform" />
      </div>
    </div>
  </button>
));

LabPackageCard.displayName = "LabPackageCard";

export const fetchHomeTestPackages = async (): Promise<PkgRow[]> => {
  const { data, error } = await supabase
    .from("test_packages")
    .select(
      `id, name, price, discount_percent, is_active, diagnostic_center_id,
       diagnostic_centers!diagnostic_center_id ( id, name, logo_url )`
    )
    .eq("is_active", true)
    .order("is_popular", { ascending: false });
  if (error) throw error;
  return (data as any) || [];
};

const HealthPackagesSection = () => {
  const navigate = useNavigate();
  const { data: rows = [], isLoading: loading } = useQuery<PkgRow[]>({
    queryKey: ["home-test-packages"],
    queryFn: fetchHomeTestPackages,
    staleTime: 5 * 60 * 1000,
  });

  const labs: LabGroup[] = useMemo(() => {
    const map = new Map<string, LabGroup>();
    rows.forEach((p) => {
      const lab = p.diagnostic_centers;
      if (!lab?.id || !lab?.name) return; // only labs with a real vendor
      const existing = map.get(lab.id);
      const price = Number(p.price) || 0;
      const disc = p.discount_percent || 0;
      if (!existing) {
        map.set(lab.id, {
          id: lab.id,
          name: lab.name,
          logo: lab.logo_url,
          count: 1,
          fromPrice: price,
          maxDiscount: disc,
        });
      } else {
        existing.count += 1;
        existing.fromPrice = Math.min(existing.fromPrice, price);
        existing.maxDiscount = Math.max(existing.maxDiscount, disc);
      }
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [rows]);

  return (
    <section className="px-4 mt-8 transform-gpu section-defer">
      <div className="flex items-end justify-between mb-3">
        <div>
          <h2 className="text-xl font-black text-foreground tracking-tight">
            Health Packages 💎
          </h2>
        </div>
        {labs.length > 0 && (
          <button
            onClick={() => navigate("/packages")}
            className="text-primary text-xs font-black bg-primary/10 px-3 py-1.5 rounded-full active:scale-95 transition-transform"
          >
            View all
          </button>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-3">
          <div className="h-[88px] rounded-3xl bg-muted/40 animate-pulse" />
          <div className="h-[88px] rounded-3xl bg-muted/40 animate-pulse" />
        </div>
      ) : labs.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl border border-dashed border-border/60 bg-gradient-to-br from-muted/40 via-background to-muted/20 p-5"
        >
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
              <HeartPulse className="w-6 h-6 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-extrabold text-foreground leading-tight">
                No health packages available yet
              </p>
              <p className="text-[11px] font-medium text-muted-foreground mt-1 leading-snug">
                Partner labs haven't published any packages in your area. New
                packages appear here automatically the moment they go live.
              </p>
            </div>
          </div>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 gap-3 list-virtual">
          {labs.slice(0, 4).map((lab, idx) => (
            <LabPackageCard
              key={lab.id}
              lab={lab}
              idx={idx}
              onClick={() => navigate(`/lab/${lab.id}`)}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default HealthPackagesSection;
