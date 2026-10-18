import React, { memo, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Star, MapPin, BadgeCheck, Heart } from "lucide-react";
import { PredictiveLink } from "@/components/ui/PredictiveLink";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useFavoriteLabs } from "@/hooks/useFavoriteLabs";

interface DiagnosticCenter {
  id: string;
  name: string;
  rating: number;
  tests: number;
  logo?: string;
  isActive?: boolean;
}

interface DiagnosticCentersCarouselProps {
  centers: DiagnosticCenter[];
}

const labMetaMap: Record<string, { distance: string; tagline: string; trustBadge: string }> = {
  "Dr. Lal PathLabs": { distance: "1.2 km", tagline: "India's Most Trusted Lab", trustBadge: "NABL & CAP Certified" },
  "Thyrocare": { distance: "2.5 km", tagline: "Quality at Affordable Prices", trustBadge: "ISO Certified" },
  "Metropolis Healthcare": { distance: "0.8 km", tagline: "Pathology Experts Since 1980", trustBadge: "NABL & CAP Accredited" },
  "SRL Diagnostics": { distance: "3.1 km", tagline: "Excellence in Diagnostics", trustBadge: "420+ Centers Nationwide" },
  "Apollo Diagnostics": { distance: "1.8 km", tagline: "Healthcare You Can Trust", trustBadge: "JCI Accredited" },
};

const fallbackMeta = [
  { distance: "2.0 km", tagline: "Trusted Health Partner", trustBadge: "NABL Certified" },
  { distance: "1.5 km", tagline: "Accurate Results, Fast", trustBadge: "ISO Certified" },
  { distance: "3.2 km", tagline: "Your Health, Our Priority", trustBadge: "Quality Assured" },
];

const LabCard = memo(({ center, index, favorite, onToggleFavorite }: {
  center: DiagnosticCenter;
  index: number;
  favorite: boolean;
  onToggleFavorite: (labId: string) => void;
}) => {
  const isClosed = center.isActive === false;
  const meta = labMetaMap[center.name] || fallbackMeta[index % fallbackMeta.length];

  return (
    <PredictiveLink
      to={`/lab/${center.id}`}
      prefetchKey={["lab-details", center.id]}
      prefetchFn={async () => {
        const { data } = await supabase
          .from('diagnostic_centers')
          .select('*')
          .eq('id', center.id)
          .maybeSingle();
        return data;
      }}
      className="flex-shrink-0 w-[280px] snap-start"
    >
      <div
        className={`relative rounded-[24px] overflow-hidden bg-white shadow-[0_8px_30px_rgb(0,0,0,0.06)] flex flex-col active:scale-[0.97] transition-all duration-200 ${isClosed ? 'grayscale opacity-80' : ''}`}
        style={{
          touchAction: 'pan-x pan-y',
          contain: 'paint' // Native-level rendering isolation
        }}
      >
        {/* Top Image Section */}
        <div className="relative h-[170px] w-full bg-muted overflow-hidden rounded-b-2xl">
          <img 
            src="/lab-bannernew.webp" 
            alt="Lab Background" 
            className="w-full h-full object-cover transform scale-[1.02]"
            loading={index < 2 ? "eager" : "lazy"}
            decoding="async"
            fetchPriority={index < 2 ? "high" : "low"}
          />
          <div className="absolute inset-0 bg-black/5" />

          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="absolute right-3 top-3 z-20 h-10 w-10 rounded-full border border-border/50 bg-card/95 shadow-md"
            aria-label={favorite ? `Remove ${center.name} from saved labs` : `Save ${center.name}`}
            aria-pressed={favorite}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onToggleFavorite(center.id);
            }}
          >
            <Heart className={`h-5 w-5 ${favorite ? "fill-destructive text-destructive" : "text-foreground"}`} />
          </Button>
          
          {/* Top Left Pill */}
          <div className="absolute top-3 left-3 bg-white/95 px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
            <BadgeCheck className="w-3.5 h-3.5 text-[#0d9488]" />
            <span className="text-[10px] font-bold text-slate-700 tracking-wide">NABL • CAP Certified</span>
          </div>



          {/* Closed Indicator */}
          {isClosed && (
            <div className="absolute bottom-3 right-3 bg-destructive/90 text-destructive-foreground text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-widest shadow-lg z-10">
              Closed
            </div>
          )}
        </div>

        {/* Bottom Info Section */}
        <div className="p-4 flex flex-col gap-2 bg-white">
          {/* Lab Name */}
          <div className="flex items-center gap-1.5">
            <h4 className="font-black text-slate-900 text-[16px] leading-tight truncate">{center.name}</h4>
            <div className="w-4 h-4 bg-[#0d9488] rounded-full flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-2.5 h-2.5 text-white">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          </div>

          {/* Rating and Distance */}
          <div className="flex items-center gap-1.5 text-[12px] font-medium text-slate-500">
            <Star className="w-3.5 h-3.5 text-[#d97706] fill-[#d97706]" />
            <span className="text-[#d97706] font-bold">{center.rating}</span>
            <span>(1.8k)</span>
            <span className="px-0.5">•</span>
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            <span>{meta.distance}</span>
          </div>

          <div className="w-full h-[1px] bg-slate-100 my-1" />

          {/* Bottom Row */}
          <div className="flex items-center justify-between mt-1">
            <div className="flex flex-col">
              <span className="text-[13px] font-black text-slate-900">120+ Tests</span>
              <span className="text-[10px] text-slate-500 font-medium -mt-0.5">Available</span>
            </div>
            <div className="bg-slate-900 hover:bg-black text-white text-[12px] font-bold px-4 py-2 rounded-[10px] transition-colors shadow-sm">
              Book Now
            </div>
          </div>
        </div>
      </div>
    </PredictiveLink>
  );
});

LabCard.displayName = "LabCard";

const DiagnosticCentersCarousel = memo(({ centers }: DiagnosticCentersCarouselProps) => {
  const navigate = useNavigate();
  const { isFavorite, toggleFavorite, favoriteLabIds } = useFavoriteLabs();

  const sortedCenters = useMemo(() => {
    return [...centers].sort((a, b) => {
      const aFav = favoriteLabIds.includes(a.id);
      const bFav = favoriteLabIds.includes(b.id);
      if (aFav && !bFav) return -1;
      if (!aFav && bFav) return 1;
      return 0;
    });
  }, [centers, favoriteLabIds]);

  return (
    <div className="relative py-6 my-4">
      {/* Solid background — backdrop-blur is too expensive on Android WebView during transitions */}
      <div className="absolute inset-0 bg-white -z-10" />
      
      {/* Header */}
      <div className="flex items-center justify-between mb-4 px-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Building2 className="w-4 h-4 text-primary" />
          </div>
          <h3 className="font-bold text-lg text-foreground tracking-tight">Partner Labs</h3>
        </div>
        <button
          onClick={() => navigate('/partner-labs')}
          className="text-primary text-xs font-bold hover:opacity-70 transition-opacity"
        >
          View all
        </button>
      </div>

      {/* Horizontal Scroll List (Native feel) */}
      <div
        className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar px-6 gap-4"
        style={{
          WebkitOverflowScrolling: 'touch',
          scrollPaddingLeft: '1.5rem',
          scrollPaddingRight: '1.5rem',
          touchAction: 'pan-x pan-y',
        }}
      >
        {sortedCenters.map((center, index) => (
          <LabCard
            key={center.id}
            center={center}
            index={index}
            favorite={isFavorite(center.id)}
            onToggleFavorite={toggleFavorite}
          />
        ))}
        {/* Spacer at the end for padding */}
        <div className="flex-shrink-0 w-2 h-full" aria-hidden="true" />
      </div>
    </div>
  );
});

DiagnosticCentersCarousel.displayName = "DiagnosticCentersCarousel";

export default DiagnosticCentersCarousel;

