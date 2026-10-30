import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, BadgeCheck, Heart } from "lucide-react";
import { PredictiveLink } from "@/components/ui/PredictiveLink";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useFavoriteLabs } from "@/hooks/useFavoriteLabs";
import { LabOpenBadge, LabRating } from "@/components/labs/lab-display";
import { LabCover, labCoverVariants, type LabArt } from "@/components/labs/LabCover";

interface DiagnosticCenter {
  id: string;
  name: string;
  rating: number | null;
  reviews: number;
  testCount: number;
  city: string | null;
  isVerified: boolean;
  homeCollection: boolean;
  vendorId: string | null;
  logo?: string;
  isActive?: boolean;
}

interface DiagnosticCentersCarouselProps {
  centers: DiagnosticCenter[];
}

const LabCard = memo(({ center, index, cover, favorite, onToggleFavorite }: {
  center: DiagnosticCenter;
  index: number;
  cover: { palette: number; art: LabArt };
  favorite: boolean;
  onToggleFavorite: (labId: string) => void;
}) => {
  const isClosed = center.isActive === false;

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
      className="flex-shrink-0 w-[78vw] sm:w-[280px] max-w-[290px] snap-start"
    >
      <div
        className={`relative rounded-[24px] overflow-hidden bg-white shadow-[0_8px_30px_rgb(0,0,0,0.06)] flex flex-col active:scale-[0.97] transition-all duration-200 ${isClosed ? 'grayscale opacity-80' : ''}`}
        style={{
          touchAction: 'pan-x pan-y',
          contain: 'paint' // Native-level rendering isolation
        }}
      >
        {/* Banner: generated per lab (colour and illustration from its name, initials, name, city) */}
        <div className="relative h-[150px] w-full overflow-hidden">
          <LabCover name={center.name} city={center.city} logoUrl={center.logo} palette={cover.palette} art={cover.art} className="absolute inset-0" />

          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="absolute right-3 top-3 z-20 h-10 w-10 rounded-full border border-border/50 bg-card/95 shadow-md"
            aria-label={favorite ? `Remove ${center.name} from saved labs` : `Save ${center.name}`}
            aria-pressed={favorite}
            onTouchStart={(event) => {
              event.stopPropagation();
            }}
            onMouseDown={(event) => {
              event.stopPropagation();
            }}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onToggleFavorite(center.id);
            }}
          >
            <Heart className={`h-5 w-5 ${favorite ? "fill-destructive text-destructive" : "text-foreground"}`} />
          </Button>
          
          {/* Top Left Pill — only a claim the data backs (BloodLyn verification) */}
          {center.isVerified && (
            <div className="absolute top-3 left-3 bg-white/95 px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
              <BadgeCheck className="w-3.5 h-3.5 text-[#0d9488]" />
              <span className="text-[10px] font-bold text-slate-700 tracking-wide">BloodLyn Verified</span>
            </div>
          )}




        </div>

        {/* Bottom Info Section */}
        <div className="p-4 flex flex-col gap-2 bg-white">
          {/* Rating (or NEW) and Open/Closed; name and city are on the banner */}
          <div className="flex items-center gap-2 text-[12px] font-medium text-slate-500">
            <LabRating rating={center.rating} reviews={center.reviews} />
            <LabOpenBadge vendorId={center.vendorId} isActive={center.isActive} />
          </div>

          <div className="w-full h-[1px] bg-slate-100 my-1" />

          {/* Bottom Row */}
          <div className="flex items-center justify-between mt-1">
            <div className="flex flex-col">
              <span className="text-[13px] font-black text-slate-900">
                {center.testCount > 0
                  ? `${center.testCount} ${center.testCount === 1 ? "Test" : "Tests"}`
                  : center.homeCollection ? "Home Collection" : "View Tests"}
              </span>
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
  const { isFavorite, toggleFavorite, favoriteLabIds, isReady } = useFavoriteLabs();

  // Saved labs lead the carousel in the order they had when it first loaded.
  // Re-sorting on every tap would move the hearted card out from under the
  // finger and slide a different lab into its place.
  const [pinnedIds, setPinnedIds] = useState<string[] | null>(null);
  useEffect(() => {
    if (isReady && pinnedIds === null) setPinnedIds(favoriteLabIds);
  }, [isReady, pinnedIds, favoriteLabIds]);

  // A tap before the saved list loads fixes the order too, so that card stays put.
  const handleToggleFavorite = useCallback((labId: string) => {
    setPinnedIds((pinned) => pinned ?? favoriteLabIds);
    toggleFavorite(labId);
  }, [favoriteLabIds, toggleFavorite]);

  const sortedCenters = useMemo(() => {
    const pinned = pinnedIds ?? [];
    return [...centers].sort((a, b) => {
      const aFav = pinned.includes(a.id);
      const bFav = pinned.includes(b.id);
      if (aFav && !bFav) return -1;
      if (!aFav && bFav) return 1;
      return 0;
    });
  }, [centers, pinnedIds]);
  const covers = useMemo(() => labCoverVariants(sortedCenters.map((c) => c.name)), [sortedCenters]);

  return (
    <div className="relative pt-1 pb-3">
      {/* Solid background — backdrop-blur is too expensive on Android WebView during transitions */}
      <div className="absolute inset-0 bg-white -z-10" />
      
      {/* Header */}
      <div className="flex items-center justify-between mb-4 px-4 sm:px-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Building2 className="w-4 h-4 text-primary" />
          </div>
          <h2 className="text-[19px] font-extrabold text-foreground tracking-tight">Partner labs</h2>
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
        className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar px-4 sm:px-6 gap-3 sm:gap-4"
        style={{
          WebkitOverflowScrolling: 'touch',
          scrollPaddingLeft: '1rem',
          scrollPaddingRight: '1rem',
          touchAction: 'pan-x pan-y',
        }}
      >
        {sortedCenters.map((center, index) => (
          <LabCard
            key={center.id}
            center={center}
            index={index}
            cover={covers[index]}
            favorite={isFavorite(center.id)}
            onToggleFavorite={handleToggleFavorite}
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

