import { useCallback, useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import useEmblaCarousel from "embla-carousel-react";
import { Building2, Star, ChevronRight, TestTubes, MapPin, Clock, BadgeCheck } from "lucide-react";
import LabBanner from "@/components/labs/LabBanner";

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
  autoPlayInterval?: number;
}

const labBannerMap: Record<string, string> = {
  "Dr. Lal PathLabs": labBannerLal,
  "Thyrocare": labBannerThyrocare,
  "Metropolis Healthcare": labBannerMetropolis,
  "SRL Diagnostics": labBannerSrl,
  "Apollo Diagnostics": labBannerApollo,
};

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

const DiagnosticCentersCarousel = ({ centers, autoPlayInterval = 4000 }: DiagnosticCentersCarouselProps) => {
  const navigate = useNavigate();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);

  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "center",
    containScroll: false,
    loop: true,
    skipSnaps: false,
    dragFree: false,
  });

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  const startAutoPlay = useCallback(() => {
    if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    autoPlayRef.current = setInterval(() => {
      if (emblaApi && isPlaying) emblaApi.scrollNext();
    }, autoPlayInterval);
  }, [emblaApi, isPlaying, autoPlayInterval]);

  const stopAutoPlay = useCallback(() => {
    if (autoPlayRef.current) { clearInterval(autoPlayRef.current); autoPlayRef.current = null; }
  }, []);

  const handlePointerDown = useCallback(() => { setIsPlaying(false); stopAutoPlay(); }, [stopAutoPlay]);
  const handlePointerUp = useCallback(() => { setTimeout(() => setIsPlaying(true), 2000); }, []);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    emblaApi.on("pointerDown", handlePointerDown);
    emblaApi.on("pointerUp", handlePointerUp);
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
      emblaApi.off("pointerDown", handlePointerDown);
      emblaApi.off("pointerUp", handlePointerUp);
    };
  }, [emblaApi, onSelect, handlePointerDown, handlePointerUp]);

  useEffect(() => {
    if (isPlaying) startAutoPlay(); else stopAutoPlay();
    return () => stopAutoPlay();
  }, [isPlaying, startAutoPlay, stopAutoPlay]);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 px-4">
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Partner Labs Near You</h3>
        </div>
        <button onClick={() => navigate('/partner-labs')} className="flex items-center gap-1 text-primary text-sm font-medium">
          View all <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Carousel */}
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {centers.map((center, index) => {
            const isActive = index === selectedIndex;
            const isClosed = center.isActive === false;
            const bannerImg = labBannerMap[center.name] || labBannerDefault;
            const meta = labMetaMap[center.name] || fallbackMeta[index % fallbackMeta.length];

            return (
              <div key={center.id} className="flex-[0_0_90%] min-w-0 pl-4 first:pl-4 last:pr-4">
                <motion.div
                  animate={{ scale: isActive ? 1 : 0.92, opacity: isActive ? 1 : 0.5 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  onClick={() => navigate(`/lab/${center.id}`)}
                  className={`relative rounded-3xl cursor-pointer overflow-hidden ${isActive ? 'shadow-2xl' : 'shadow-xl'} ${isClosed ? 'grayscale' : ''}`}
                  style={{ minHeight: '200px' }}
                >
                  {/* Banner Image Background */}
                  <img
                    src={bannerImg}
                    alt={center.name}
                    className="absolute inset-0 w-full h-full object-cover"
                    loading="lazy"
                    width={800}
                    height={512}
                  />
                  {/* Dark Overlay for text readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />

                  {/* Closed Overlay */}
                  {isClosed && (
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30">
                      <div className="bg-destructive px-4 py-1.5 rounded-lg shadow-lg">
                        <p className="text-[10px] text-white font-medium">Currently</p>
                        <p className="text-sm font-extrabold text-white -mt-0.5">CLOSED</p>
                      </div>
                    </div>
                  )}

                  {/* Content */}
                  <div className="relative p-5 flex flex-col h-full min-h-[200px] justify-end">
                    {/* Trust Badge */}
                    <div className="absolute top-3 right-3 flex items-center gap-1 bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full">
                      <BadgeCheck className="w-3.5 h-3.5 text-green-400" />
                      <span className="text-[10px] font-medium text-white">{meta.trustBadge}</span>
                    </div>

                    <h4 className="font-bold text-white text-lg leading-tight drop-shadow-md">{center.name}</h4>
                    <p className="text-white/80 text-xs font-medium mt-0.5 italic">
                      {isClosed ? "Currently not accepting orders" : `"${meta.tagline}"`}
                    </p>

                    {/* Stats Row */}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full">
                        <Star className="w-3.5 h-3.5 text-yellow-300 fill-yellow-300" />
                        <span className="text-xs font-bold text-white">{center.rating}</span>
                      </div>
                      <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full">
                        <MapPin className="w-3.5 h-3.5 text-white" />
                        <span className="text-xs font-medium text-white">{meta.distance}</span>
                      </div>
                      <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full">
                        <TestTubes className="w-3.5 h-3.5 text-white" />
                        <span className="text-xs font-medium text-white">{center.tests}+ tests</span>
                      </div>
                    </div>

                    {/* Bottom CTA */}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/20">
                      <div className="flex items-center gap-1.5 text-white/70">
                        <Clock className="w-3.5 h-3.5" />
                        <span className="text-xs">Reports in 24 hrs</span>
                      </div>
                      <motion.button
                        className="flex items-center gap-1.5 bg-white text-gray-900 font-bold text-sm px-4 py-2 rounded-full shadow-lg"
                        whileTap={{ scale: 0.98 }}
                      >
                        Explore <ChevronRight className="w-4 h-4" />
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pagination Dots */}
      <div className="flex justify-center gap-1.5 mt-4">
        {centers.map((_, index) => (
          <motion.div
            key={index}
            animate={{
              width: index === selectedIndex ? 24 : 8,
              backgroundColor: index === selectedIndex ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.3)",
            }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="h-2 rounded-full"
          />
        ))}
      </div>
    </motion.div>
  );
};

export default DiagnosticCentersCarousel;
