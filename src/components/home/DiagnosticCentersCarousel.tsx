import { useCallback, useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import useEmblaCarousel from "embla-carousel-react";
import { Building2, Star, ChevronRight, TestTubes, MapPin, Clock, Shield, Zap, Award, TrendingUp, Heart, BadgeCheck } from "lucide-react";

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

// Comprehensive lab brand data with unique visual identities and psychological triggers
const labBrandData: Record<string, { 
  logo: string; 
  distance: string;
  bannerImage: string;
  tagline: string;
  urgencyText: string;
  trustBadge: string;
  accentIcon: 'shield' | 'zap' | 'award' | 'heart' | 'trending';
  gradient: string;
  overlayPattern: 'dots' | 'waves' | 'grid' | 'radial' | 'diagonal';
}> = {
  "Dr. Lal PathLabs": {
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Dr_Lal_PathLabs_logo.svg/200px-Dr_Lal_PathLabs_logo.svg.png",
    distance: "1.2 km",
    bannerImage: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800&q=80",
    tagline: "India's Most Trusted Lab",
    urgencyText: "Up to 40% OFF Today",
    trustBadge: "NABL & CAP Certified",
    accentIcon: 'shield',
    gradient: "from-[#003087] via-[#0052cc] to-[#0073e6]",
    overlayPattern: 'waves'
  },
  "Thyrocare": {
    logo: "https://www.thyrocare.com/NewAssets2/images/thyrocare-logo.png",
    distance: "2.5 km",
    bannerImage: "https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=800&q=80",
    tagline: "Quality at Affordable Prices",
    urgencyText: "Flat 50% OFF Packages",
    trustBadge: "ISO Certified",
    accentIcon: 'trending',
    gradient: "from-[#6b21a8] via-[#7c3aed] to-[#8b5cf6]",
    overlayPattern: 'radial'
  },
  "Metropolis Healthcare": {
    logo: "https://www.metropolisindia.com/assets/images/metropolis-logo-new.svg",
    distance: "0.8 km",
    bannerImage: "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=800&q=80",
    tagline: "Pathology Experts Since 1980",
    urgencyText: "Free Home Collection",
    trustBadge: "NABL & CAP Accredited",
    accentIcon: 'award',
    gradient: "from-[#0d9488] via-[#14b8a6] to-[#2dd4bf]",
    overlayPattern: 'dots'
  },
  "SRL Diagnostics": {
    logo: "https://www.srlworld.com/assets/images/srl-logo.svg",
    distance: "3.1 km",
    bannerImage: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&q=80",
    tagline: "Excellence in Diagnostics",
    urgencyText: "Reports in 6 Hours",
    trustBadge: "420+ Centers Nationwide",
    accentIcon: 'zap',
    gradient: "from-[#b91c1c] via-[#dc2626] to-[#ef4444]",
    overlayPattern: 'diagonal'
  },
  "Apollo Diagnostics": {
    logo: "https://www.apollodiagnostics.in/assets/images/apollo-logo.png",
    distance: "1.8 km",
    bannerImage: "https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=800&q=80",
    tagline: "Healthcare You Can Trust",
    urgencyText: "Senior Citizen 20% OFF",
    trustBadge: "JCI Accredited",
    accentIcon: 'heart',
    gradient: "from-[#0369a1] via-[#0284c7] to-[#38bdf8]",
    overlayPattern: 'grid'
  },
};

// Fallback data for unknown labs with varied visual identities
const fallbackLabThemes = [
  { 
    distance: "2.0 km", 
    tagline: "Trusted Health Partner", 
    urgencyText: "Special Discount",
    trustBadge: "NABL Certified",
    accentIcon: 'shield' as const,
    gradient: "from-[#1e40af] via-[#3b82f6] to-[#60a5fa]",
    overlayPattern: 'waves' as const
  },
  { 
    distance: "1.5 km", 
    tagline: "Accurate Results, Fast", 
    urgencyText: "Home Collection Free",
    trustBadge: "ISO Certified",
    accentIcon: 'zap' as const,
    gradient: "from-[#7e22ce] via-[#a855f7] to-[#c084fc]",
    overlayPattern: 'radial' as const
  },
  { 
    distance: "3.2 km", 
    tagline: "Your Health, Our Priority", 
    urgencyText: "Up to 35% OFF",
    trustBadge: "Quality Assured",
    accentIcon: 'heart' as const,
    gradient: "from-[#059669] via-[#10b981] to-[#34d399]",
    overlayPattern: 'dots' as const
  },
  { 
    distance: "2.8 km", 
    tagline: "Advanced Diagnostics", 
    urgencyText: "Book & Save",
    trustBadge: "Expert Team",
    accentIcon: 'award' as const,
    gradient: "from-[#ea580c] via-[#f97316] to-[#fb923c]",
    overlayPattern: 'diagonal' as const
  },
  { 
    distance: "1.9 km", 
    tagline: "Precision Healthcare", 
    urgencyText: "Limited Time Offer",
    trustBadge: "Accredited Lab",
    accentIcon: 'trending' as const,
    gradient: "from-[#be185d] via-[#ec4899] to-[#f472b6]",
    overlayPattern: 'grid' as const
  },
];

const accentIcons = {
  shield: Shield,
  zap: Zap,
  award: Award,
  heart: Heart,
  trending: TrendingUp,
};

const DiagnosticCentersCarousel = ({ 
  centers, 
  autoPlayInterval = 4000 
}: DiagnosticCentersCarouselProps) => {
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

  // Auto-play logic
  const startAutoPlay = useCallback(() => {
    if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    autoPlayRef.current = setInterval(() => {
      if (emblaApi && isPlaying) {
        emblaApi.scrollNext();
      }
    }, autoPlayInterval);
  }, [emblaApi, isPlaying, autoPlayInterval]);

  const stopAutoPlay = useCallback(() => {
    if (autoPlayRef.current) {
      clearInterval(autoPlayRef.current);
      autoPlayRef.current = null;
    }
  }, []);

  // Pause on interaction
  const handlePointerDown = useCallback(() => {
    setIsPlaying(false);
    stopAutoPlay();
  }, [stopAutoPlay]);

  const handlePointerUp = useCallback(() => {
    // Resume after a short delay
    setTimeout(() => {
      setIsPlaying(true);
    }, 2000);
  }, []);

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

  // Start/stop auto-play based on isPlaying state
  useEffect(() => {
    if (isPlaying) {
      startAutoPlay();
    } else {
      stopAutoPlay();
    }
    return () => stopAutoPlay();
  }, [isPlaying, startAutoPlay, stopAutoPlay]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="mt-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4 px-4">
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Partner Labs Near You</h3>
        </div>
        <button 
          onClick={() => navigate('/partner-labs')}
          className="flex items-center gap-1 text-primary text-sm font-medium"
        >
          View all <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Carousel */}
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {centers.map((center, index) => {
            const isActive = index === selectedIndex;
            const isClosed = center.isActive === false;
            
            // Get lab-specific data or use fallback
            const knownLabData = labBrandData[center.name];
            const fallbackData = fallbackLabThemes[index % fallbackLabThemes.length];
            
            const labData = knownLabData || fallbackData;
            const logoUrl = knownLabData?.logo || center.logo;
            const AccentIcon = accentIcons[labData.accentIcon];
            
            return (
              <div
                key={center.id}
                className="flex-[0_0_90%] min-w-0 pl-4 first:pl-4 last:pr-4"
              >
                <motion.div
                  animate={{
                    scale: isActive ? 1 : 0.92,
                    opacity: isActive ? 1 : 0.5,
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 30,
                  }}
                  onClick={() => navigate(`/lab/${center.id}`)}
                  className={`relative rounded-3xl cursor-pointer overflow-hidden ${
                    isActive ? 'shadow-2xl' : 'shadow-xl'
                  } ${isClosed ? 'grayscale' : ''}`}
                  style={{
                    minHeight: '200px',
                  }}
                >
                  {/* Background Gradient Layer */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${labData.gradient}`} />
                  
                  {/* Pattern Overlay based on lab theme */}
                  <div className="absolute inset-0 opacity-10">
                    {labData.overlayPattern === 'dots' && (
                      <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                        <pattern id={`dots-${index}`} x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                          <circle cx="10" cy="10" r="2" fill="white" />
                        </pattern>
                        <rect width="100%" height="100%" fill={`url(#dots-${index})`} />
                      </svg>
                    )}
                    {labData.overlayPattern === 'waves' && (
                      <div></div>
                    )}
                    {labData.overlayPattern === 'grid' && (
                      <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                        <pattern id={`grid-${index}`} x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
                          <path d="M30,0 L0,0 L0,30" fill="none" stroke="white" strokeWidth="1" />
                        </pattern>
                        <rect width="100%" height="100%" fill={`url(#grid-${index})`} />
                      </svg>
                    )}
                    {labData.overlayPattern === 'radial' && (
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_70%,rgba(255,255,255,0.3),transparent_50%)]" />
                    )}
                    {labData.overlayPattern === 'diagonal' && (
                      <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                        <pattern id={`diag-${index}`} x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                          <line x1="0" y1="20" x2="20" y2="0" stroke="white" strokeWidth="1" />
                        </pattern>
                        <rect width="100%" height="100%" fill={`url(#diag-${index})`} />
                      </svg>
                    )}
                  </div>
                  
                  {/* Decorative Blobs */}
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-xl" />
                  <div className="absolute -bottom-8 -left-8 w-28 h-28 bg-white/10 rounded-full blur-xl" />
                  
                  {/* Shimmer Effect - Only on active card */}
                  {isActive && (
                    <div className="absolute inset-0 overflow-hidden">
                      <div 
                        className="absolute inset-0 -translate-x-full animate-[shimmer_3s_infinite]"
                        style={{
                          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                        }}
                      />
                    </div>
                  )}
                  
                  {/* Glowing Pulse Effect for Active Card */}
                  {isActive && (
                    <motion.div 
                      className="absolute inset-0 rounded-3xl"
                      animate={{ 
                        boxShadow: [
                          '0 0 20px rgba(255,255,255,0.1)',
                          '0 0 40px rgba(255,255,255,0.2)',
                          '0 0 20px rgba(255,255,255,0.1)'
                        ]
                      }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    />
                  )}
                  
                  {/* Content */}
                  <div className="relative p-5 flex flex-col h-full min-h-[200px]">
                    {/* Main Content Row */}
                    <div className="flex items-center gap-4 flex-1">
                      {/* Logo Container - Prominent Display */}
                      <div className="relative">
                        <div className="w-20 h-20 rounded-2xl bg-white flex items-center justify-center flex-shrink-0 shadow-xl border-2 border-white/50 overflow-hidden">
                          {logoUrl ? (
                            <img 
                              src={logoUrl} 
                              alt={center.name} 
                              className="w-16 h-16 object-contain p-1"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.nextElementSibling?.classList.remove('hidden');
                              }}
                            />
                          ) : null}
                          <Building2 className={`w-10 h-10 text-gray-600 ${logoUrl ? 'hidden' : ''}`} />
                        </div>
                        {/* Accent Icon Badge */}
                        <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white shadow-lg flex items-center justify-center">
                          <AccentIcon className="w-4 h-4 text-primary" />
                        </div>
                      </div>
                      
                      {/* Lab Info */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-white text-lg leading-tight line-clamp-1 drop-shadow-md">
                          {center.name}
                        </h4>
                        
                        {/* Tagline - Emotional Appeal */}
                        <p className="text-white/80 text-xs font-medium mt-0.5 italic">
                          "{labData.tagline}"
                        </p>
                        
                        {/* Stats Row */}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {/* Rating */}
                          <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full">
                            <Star className="w-3.5 h-3.5 text-yellow-300 fill-yellow-300" />
                            <span className="text-xs font-bold text-white">{center.rating}</span>
                          </div>
                          
                          {/* Distance */}
                          <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full">
                            <MapPin className="w-3.5 h-3.5 text-white" />
                            <span className="text-xs font-medium text-white">{labData.distance}</span>
                          </div>
                          
                          {/* Tests Count */}
                          <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full">
                            <TestTubes className="w-3.5 h-3.5 text-white" />
                            <span className="text-xs font-medium text-white">{center.tests}+ tests</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Bottom CTA Row */}
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/20">
                      <div className="flex items-center gap-1.5 text-white/70">
                        <Clock className="w-3.5 h-3.5" />
                        <span className="text-xs">Reports in 24 hrs</span>
                      </div>
                      
                      <motion.button 
                        className="flex items-center gap-1.5 bg-white text-gray-900 font-bold text-sm px-4 py-2 rounded-full shadow-lg"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.98 }}
                        animate={isActive ? { 
                          boxShadow: [
                            '0 4px 15px rgba(255,255,255,0.3)',
                            '0 6px 25px rgba(255,255,255,0.5)',
                            '0 4px 15px rgba(255,255,255,0.3)'
                          ]
                        } : {}}
                        transition={{ duration: 1.5, repeat: Infinity }}
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
              backgroundColor: index === selectedIndex 
                ? "hsl(var(--primary))" 
                : "hsl(var(--muted-foreground) / 0.3)",
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