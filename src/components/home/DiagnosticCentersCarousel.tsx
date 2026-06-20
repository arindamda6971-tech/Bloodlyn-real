import { useNavigate } from "react-router-dom";
import { Building2, Star, ChevronRight, MapPin, BadgeCheck } from "lucide-react";
import LabBanner from "@/components/labs/LabBanner";
import { PredictiveLink } from "@/components/ui/PredictiveLink";
import { supabase } from "@/integrations/supabase/client";

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

const DiagnosticCentersCarousel = ({ centers }: DiagnosticCentersCarouselProps) => {
  const navigate = useNavigate();

  return (
    <div className="mt-6 mb-2">
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
          touchAction: 'pan-x pan-y'
        }}
      >
        {centers.map((center, index) => {
          const isClosed = center.isActive === false;
          const meta = labMetaMap[center.name] || fallbackMeta[index % fallbackMeta.length];

          return (
            <PredictiveLink
              key={center.id}
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
                className={`relative rounded-3xl overflow-hidden border border-border/40 bg-card active:scale-[0.97] transition-all duration-200 ${isClosed ? 'grayscale opacity-80' : 'shadow-sm'}`}
                style={{
                  height: '180px',
                  touchAction: 'pan-x pan-y'
                }}
              >
                {/* Visual Banner */}
                <div className="absolute inset-0 z-0">
                   <LabBanner labName={center.name} />
                   <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                </div>

                {/* Trust Badge */}
                <div className="absolute top-3 left-3 z-10">
                   <div className="flex items-center gap-1 bg-white/10 backdrop-blur-md border border-white/10 px-2 py-1 rounded-full">
                      <BadgeCheck className="w-3 h-3 text-primary" />
                      <span className="text-[9px] font-bold text-white uppercase tracking-wider">{meta.trustBadge}</span>
                   </div>
                </div>

                {/* Closed Indicator */}
                {isClosed && (
                  <div className="absolute top-3 right-3 z-10 bg-destructive/90 text-white text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-widest shadow-lg">
                    Closed
                  </div>
                )}

                {/* Lab Info */}
                <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <h4 className="font-black text-white text-base leading-tight truncate drop-shadow-sm">{center.name}</h4>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                        <span className="text-xs font-bold text-white/90">{center.rating}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-white/60" />
                        <span className="text-[11px] font-medium text-white/80">{meta.distance}</span>
                      </div>
                    </div>
                    <div className="bg-primary/20 backdrop-blur-sm border border-primary/30 px-2.5 py-1 rounded-full">
                      <p className="text-[10px] font-bold text-primary-foreground">{center.tests}+ Tests</p>
                    </div>
                  </div>
                </div>
              </div>
            </PredictiveLink>
          );
        })}
        {/* Spacer at the end for padding */}
        <div className="flex-shrink-0 w-2 h-full" aria-hidden="true" />
      </div>
    </div>
  );
};

export default DiagnosticCentersCarousel;
