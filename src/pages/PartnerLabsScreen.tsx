import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Building2,
  Star,
  MapPin,
  Clock,
  ChevronRight,
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import ScreenHeader from "@/components/layout/ScreenHeader";
import MobileLayout from "@/components/layout/MobileLayout";
import LoadingSpinner from "@/components/ui/loading-spinner";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeDiagnosticCenters } from "@/hooks/useRealtimeDiagnosticCenters";

interface DiagnosticCenter {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string | null;
  rating: number | null;
  reviews_count: number | null;
  is_verified: boolean | null;
  home_collection_available: boolean | null;
  opening_time: string | null;
  closing_time: string | null;
  logo_url: string | null;
  vendor_id: string | null;
  services: any;
  available_tests: any;
  is_active: boolean | null;
}

const PartnerLabsScreen = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [diagnosticCenters, setDiagnosticCenters] = useState<DiagnosticCenter[]>([]);
  const [loading, setLoading] = useState(true);

  // Subscribe to real-time updates
  useRealtimeDiagnosticCenters();

  useEffect(() => {
    const fetchDiagnosticCenters = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("diagnostic_centers")
          .select("*")
          .order("rating", { ascending: false });

        if (error) {
          console.error("Error fetching diagnostic centers:", error);
        } else {
          setDiagnosticCenters(data || []);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDiagnosticCenters();
  }, []);

  const filteredCenters = diagnosticCenters.filter((center) => {
    const matchesSearch =
      center.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      center.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      center.city.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // Calculate total tests from available_tests
  const getTestCount = (center: DiagnosticCenter) => {
    if (Array.isArray(center.available_tests)) {
      return center.available_tests.length;
    }
    return 0;
  };

  // Format timing
  const formatTiming = (opening: string | null, closing: string | null) => {
    if (!opening || !closing) return "Open 24/7";
    return `${opening} - ${closing}`;
  };

  return (
    <MobileLayout showNav={false}>
      <ScreenHeader title="Partner Labs" />

      <div className="px-4 py-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search labs by name or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 p-3 rounded-xl bg-primary/5 border border-primary/10">
          <div className="flex-1 text-center">
            <p className="text-xl font-bold text-primary">{diagnosticCenters.length}+</p>
            <p className="text-xs text-muted-foreground">Partner Labs</p>
          </div>
          <div className="w-px h-10 bg-border" />
          <div className="flex-1 text-center">
            <p className="text-xl font-bold text-primary">500+</p>
            <p className="text-xs text-muted-foreground">Cities</p>
          </div>
          <div className="w-px h-10 bg-border" />
          <div className="flex-1 text-center">
            <p className="text-xl font-bold text-primary">24/7</p>
            <p className="text-xs text-muted-foreground">Support</p>
          </div>
        </div>

        {/* Labs List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <div className="space-y-3 pb-8">
            {filteredCenters.map((center, index) => (
              <motion.div
                key={center.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="soft-card p-4 cursor-pointer"
                onClick={() => navigate(`/lab/${center.id}`)}
              >
                <div className="flex gap-3">
                  {/* Lab Icon */}
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    {center.logo_url ? (
                      <img
                        src={center.logo_url}
                        alt={center.name}
                        className="w-10 h-10 object-contain rounded-lg"
                      />
                    ) : (
                      <Building2 className="w-7 h-7 text-primary" />
                    )}
                  </div>

                  {/* Lab Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-foreground truncate">{center.name}</h3>
                      {center.home_collection_available && (
                        <Badge variant="outline" className="text-[10px] flex-shrink-0">
                          Home Collection
                        </Badge>
                      )}
                    </div>

                    {/* Rating */}
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 text-warning fill-warning" />
                        <span className="text-sm font-medium text-foreground">
                          {center.rating || 4.5}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        ({(center.reviews_count || 0).toLocaleString()} reviews)
                      </span>
                      {getTestCount(center) > 0 && (
                        <>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs text-primary font-medium">
                            {getTestCount(center)}+ tests
                          </span>
                        </>
                      )}
                    </div>

                    {/* Location */}
                    <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate">{center.city}, {center.state}</span>
                    </div>

                    {/* Timing */}
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>{formatTiming(center.opening_time, center.closing_time)}</span>
                      </div>
                    </div>

                    {/* Accreditations */}
                    <div className="flex items-center gap-1.5 mt-2">
                      {center.is_verified && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          Verified
                        </Badge>
                      )}
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        NABL
                      </Badge>
                    </div>
                  </div>

                  {/* Arrow */}
                  <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0 self-center" />
                </div>
              </motion.div>
            ))}

            {filteredCenters.length === 0 && !loading && (
              <div className="text-center py-12">
                <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No labs found matching your search</p>
              </div>
            )}
          </div>
        )}
      </div>
    </MobileLayout>
  );
};

export default PartnerLabsScreen;
