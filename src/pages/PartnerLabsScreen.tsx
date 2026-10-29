import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
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
import { useUserPincode, labServesPincode } from "@/hooks/useUserPincode";
import { Bell, MapPinOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useSEO } from "@/hooks/useSEO";
import { LabAvatar, LabOpenBadge, LabRating } from "@/components/labs/lab-display";

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
  useSEO({ title: "Partner Diagnostic Centers | BloodLyn", description: "Discover partner diagnostic centers near you, with home sample collection and real patient ratings." });
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [diagnosticCenters, setDiagnosticCenters] = useState<DiagnosticCenter[]>([]);
  const [totalCities, setTotalCities] = useState(0);
  const [loading, setLoading] = useState(true);

  // Subscribe to real-time updates
  useRealtimeDiagnosticCenters();
  const { pincode: userPincode } = useUserPincode();

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
          const uniqueCities = new Set((data || []).map((c: any) => c.city?.trim().toLowerCase()).filter(Boolean));
          setTotalCities(uniqueCities.size);
          // Filter to only labs serving the user's pincode (Zomato-style)
          const serviceable = (data || []).filter((c) => labServesPincode(c as any, userPincode));
          setDiagnosticCenters(serviceable);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDiagnosticCenters();
  }, [userPincode]);

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

  const homeCollectionCount = diagnosticCenters.filter((c) => c.home_collection_available).length;

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
            <p className="text-xl font-bold text-primary">{diagnosticCenters.length}</p>
            <p className="text-xs text-muted-foreground">Partner Labs</p>
          </div>
          <div className="w-px h-10 bg-border" />
          <div className="flex-1 text-center">
            <p className="text-xl font-bold text-primary">{totalCities}</p>
            <p className="text-xs text-muted-foreground">Cities</p>
          </div>
          <div className="w-px h-10 bg-border" />
          <div className="flex-1 text-center">
            <p className="text-xl font-bold text-primary">{homeCollectionCount}</p>
            <p className="text-xs text-muted-foreground">Home Collection</p>
          </div>
        </div>

        {/* Labs List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <div className="space-y-3 pb-8 list-virtual-lg">
            {filteredCenters.map((center, index) => (
              <motion.div
                key={center.id}
                initial={false}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0}}
                className={`soft-card p-4 cursor-pointer relative overflow-hidden ${center.is_active === false ? 'grayscale opacity-75' : ''}`}
                onClick={() => navigate(`/lab/${center.id}`)}
              >
                <div className="flex gap-3">
                  {/* Lab Icon */}
                  <LabAvatar name={center.name} logoUrl={center.logo_url} />

                  {/* Lab Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <motion.h3 className="font-semibold text-foreground truncate">{center.name}</motion.h3>
                      {center.home_collection_available && (
                        <Badge variant="outline" className="text-[10px] flex-shrink-0">
                          Home Collection
                        </Badge>
                      )}
                    </div>

                    {/* Rating */}
                    <div className="flex items-center gap-2 mt-1">
                      <LabRating rating={center.rating} reviews={center.reviews_count} />
                      {getTestCount(center) > 0 && (
                        <>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs text-primary font-medium">
                            {getTestCount(center)} {getTestCount(center) === 1 ? "test" : "tests"}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Location */}
                    <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate">{center.city}, {center.state}</span>
                    </div>



                    {/* Only claims the data backs: BloodLyn verification. Accreditations
                        such as NABL need a verified field before they can be shown. */}
                    <div className="flex items-center gap-1.5 mt-2 empty:hidden">
                      <LabOpenBadge vendorId={center.vendor_id} isActive={center.is_active} />
                      {center.is_verified && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          Verified
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Arrow */}
                  <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0 self-center" />
                </div>
              </motion.div>
            ))}

            {filteredCenters.length === 0 && !loading && (
              <div className="text-center py-12 px-4">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <MapPinOff className="w-10 h-10 text-primary" />
                </div>
                <h3 className="text-base font-bold text-foreground mb-1">
                  {searchQuery ? "No labs match your search" : userPincode ? "No labs in your area yet" : "No labs available"}
                </h3>
                <p className="text-sm text-muted-foreground mb-5 max-w-[280px] mx-auto">
                  {searchQuery
                    ? "Try a different lab name or city."
                    : userPincode
                      ? `We're not live at PIN ${userPincode} yet. Be the first to know when a partner lab joins your area.`
                      : "Set your delivery pincode to see labs that serve you."}
                </p>
                {!searchQuery && userPincode && (
                  <Button
                    variant="hero"
                    onClick={() => toast.success("We'll notify you!", { description: `You'll be the first to know when a lab launches at PIN ${userPincode}.` })}
                  >
                    <Bell className="w-4 h-4 mr-2" />
                    Notify Me When Available
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </MobileLayout>
  );
};

export default PartnerLabsScreen;
