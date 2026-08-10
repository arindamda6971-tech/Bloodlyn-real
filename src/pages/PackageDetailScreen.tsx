import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  ShoppingCart,
  Plus,
  Check,
  AlertCircle,
  HeartPulse,
  Activity,
  Shield,
  Clock,
  Home,
  Star,
  ChevronRight,
  Zap,
  TrendingDown,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import MobileLayout from "@/components/layout/MobileLayout";
import ScreenHeader from "@/components/layout/ScreenHeader";
import LoadingSpinner from "@/components/ui/loading-spinner";
import { supabase } from "@/integrations/supabase/client";

interface PackageTest {
  id: string;
  name: string;
  price: number;
  category: string;
}

interface PackageData {
  id: string;
  name: string;
  description: string | null;
  tests_count: number;
  price: number;
  original_price: number | null;
  discount_percent: number | null;
  icon: string | null;
  color: string | null;
  lab_id: string | null;
  lab_name: string | null;
  lab_logo: string | null;
  tests?: PackageTest[];
}

interface LabOption {
  id: string;
  name: string;
  rating: number;
  reviews: number;
  priceMultiplier: number;
  accredited: boolean;
  homeCollection: boolean;
  reportTime: string;
}

// Available labs for packages
const labOptionsMap: Record<string, LabOption[]> = {
  default: [
    { 
      id: "lal-pathlabs", 
      name: "Dr. Lal PathLabs", 
      rating: 4.8, 
      reviews: 2500,
      priceMultiplier: 1,
      accredited: true,
      homeCollection: true,
      reportTime: "Same day"
    },
    { 
      id: "metropolis", 
      name: "Metropolis Healthcare", 
      rating: 4.7, 
      reviews: 1800,
      priceMultiplier: 1.05,
      accredited: true,
      homeCollection: true,
      reportTime: "Next day"
    },
    { 
      id: "srl", 
      name: "SRL Diagnostics", 
      rating: 4.6, 
      reviews: 1500,
      priceMultiplier: 0.95,
      accredited: true,
      homeCollection: true,
      reportTime: "Same day"
    },
    { 
      id: "thyrocare", 
      name: "Thyrocare", 
      rating: 4.5, 
      reviews: 3200,
      priceMultiplier: 0.85,
      accredited: true,
      homeCollection: true,
      reportTime: "Next day"
    },
    { 
      id: "apollo", 
      name: "Apollo Diagnostics", 
      rating: 4.7, 
      reviews: 2100,
      priceMultiplier: 1.1,
      accredited: true,
      homeCollection: true,
      reportTime: "Same day"
    },
  ],
};

const defaultIncludes = [
  { icon: Home, text: "Home sample collection" },
  { icon: Shield, text: "NABL certified labs" },
  { icon: Clock, text: "Fast reports" },
  { icon: HeartPulse, text: "Comprehensive tests" },
];

const PackageDetailScreen = () => {
  const navigate = useNavigate();
  const { packageId } = useParams<{ packageId: string }>();
  const { addToCart, pendingItem, confirmReplace, cancelReplace } = useCart();
  
  const [packageData, setPackageData] = useState<PackageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLabId, setSelectedLabId] = useState<string>("lal-pathlabs");
  const [packageTests, setPackageTests] = useState<PackageTest[]>([]);
  const [fetchingTests, setFetchingTests] = useState(false);

  // Fetch package data from Supabase
  const fetchPackageData = useCallback(async () => {
    if (!packageId) {
      setError("Package ID not provided");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from("test_packages")
        .select(`
          id, name, description, tests_count, price, original_price, discount_percent, icon, color,
          diagnostic_centers!diagnostic_center_id (id, name, logo_url)
        `)
        .eq("id", packageId)
        .maybeSingle();

      if (fetchError) {
        console.error("Error fetching package:", fetchError);
        setError("Failed to load package details");
      } else if (!data) {
        setError("Package not found");
      } else {
        setPackageData({
          id: data.id,
          name: data.name,
          description: data.description,
          tests_count: data.tests_count || 0,
          price: data.price,
          original_price: data.original_price ?? null,
          discount_percent: data.discount_percent ?? null,
          icon: data.icon ?? null,
          color: data.color ?? null,
          lab_id: data.diagnostic_centers?.id ?? null,
          lab_name: data.diagnostic_centers?.name ?? null,
          lab_logo: data.diagnostic_centers?.logo_url ?? null,
        });
      }
    } catch (err) {
      console.error("Error:", err);
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [packageId]);

  // Fetch tests included in the package
  const fetchPackageTests = useCallback(async () => {
    if (!packageId) return;

    try {
      setFetchingTests(true);
      const { data, error: fetchError } = await supabase
        .from("package_tests")
        .select(`
          test_id,
          tests!test_id (id, name, price, category: test_category)
        `)
        .eq("package_id", packageId);

      if (fetchError) {
        console.error("Error fetching package tests:", fetchError);
      } else if (data && data.length > 0) {
        const tests = data
          .map((pt: any) => ({
            id: pt.tests?.id,
            name: pt.tests?.name,
            price: pt.tests?.price,
            category: pt.tests?.test_category || "General",
          }))
          .filter((t: any) => t.id && t.name);
        setPackageTests(tests);
      }
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setFetchingTests(false);
    }
  }, [packageId]);

  useEffect(() => {
    fetchPackageData();
    fetchPackageTests();
  }, [fetchPackageData, fetchPackageTests]);

  if (loading) {
    return (
      <MobileLayout>
        <ScreenHeader title="Package Details" />
        <div className="flex items-center justify-center h-[60vh]">
          <LoadingSpinner size="lg" />
        </div>
      </MobileLayout>
    );
  }

  if (error || !packageData) {
    return (
      <MobileLayout>
        <ScreenHeader title="Package Details" />
        <div className="flex flex-col items-center justify-center h-[60vh] px-4 text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-2">
            {error || "Package not found"}
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            The package you're looking for doesn't exist or has been removed.
          </p>
          <Button onClick={() => navigate("/packages")}>
            Browse Packages
          </Button>
        </div>
      </MobileLayout>
    );
  }

  const labOptions = packageData.lab_id 
    ? [labOptionsMap.default[0]] // If specific lab, show that lab
    : labOptionsMap.default;

  const selectedLab = labOptions.find(lab => lab.id === selectedLabId) || labOptions[0];
  const displayPrice = Math.round(packageData.price * selectedLab.priceMultiplier);
  const discountPercent = packageData.discount_percent || 
    (packageData.original_price 
      ? Math.round((1 - displayPrice / packageData.original_price) * 100) 
      : 0);

  const handleAddToCart = () => {
    const success = addToCart({
      id: `${packageData.id}-${selectedLab.id}`,
      name: packageData.name,
      price: displayPrice,
      labId: selectedLab.id,
      labName: selectedLab.name,
    });

    if (success) {
      toast.success(`${packageData.name} added to cart from ${selectedLab.name}`);
    }
  };

  const handleConfirmReplace = () => {
    confirmReplace();
    toast.success("Cart replaced with package");
  };

  return (
    <MobileLayout>
      <ScreenHeader title="Package Details" />

      <div className="pb-32">
        {/* Hero Section with Gradient Background */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-primary/10 via-accent/5 to-background pt-6 pb-8 px-4 relative overflow-hidden"
        >
          {/* Background decorative elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-success/5 rounded-full -ml-12 -mb-12" />

          <div className="relative z-10">
            {/* Discount Badge */}
            {discountPercent > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-1.5 mb-4 px-3 py-1.5 bg-destructive/90 text-destructive-foreground rounded-full"
              >
                <TrendingDown className="w-4 h-4" />
                <span className="font-bold text-sm">{discountPercent}% OFF</span>
              </motion.div>
            )}

            {/* Package Title & Tests Count */}
            <h1 className="text-2xl font-bold text-foreground leading-tight mb-2">
              {packageData.name}
            </h1>
            
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="secondary" className="bg-primary/20 text-primary border-0">
                <Zap className="w-3.5 h-3.5 mr-1" />
                {packageData.tests_count} Tests Included
              </Badge>
            </div>

            {/* Show lab info when package is tied to a specific diagnostic center */}
            {packageData.lab_id && (
              <div className="mt-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-md bg-muted/50 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{packageData.lab_name || selectedLab.name}</p>
                  <p className="text-xs text-muted-foreground">{selectedLab.rating} • {selectedLab.reviews.toLocaleString()} reviews</p>
                </div>
              </div>
            )}

            {packageData.description && (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {packageData.description}
              </p>
            )}

            {/* Price Section - Modern Design */}
            <div className="mt-6 bg-white/50 dark:bg-secondary/20 backdrop-blur-sm rounded-2xl p-4 border border-border/40">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Total Price</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-primary">₹{displayPrice}</p>
                {packageData.original_price && packageData.original_price > displayPrice && (
                  <p className="text-sm text-muted-foreground line-through">₹{packageData.original_price}</p>
                )}
              </div>
              {packageData.original_price && packageData.original_price > displayPrice && (
                <p className="text-xs text-success font-semibold mt-2">
                  Save ₹{packageData.original_price - displayPrice}
                </p>
              )}
            </div>
          </div>
        </motion.div>

        <div className="px-4 space-y-6 py-6">
          {/* What's Included - Modern Grid Layout */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <HeartPulse className="w-5 h-5 text-primary" />
              What's Included
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {defaultIncludes.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 + index * 0.05 }}
                  className="bg-gradient-to-br from-success/10 to-success/5 rounded-xl p-3.5 border border-success/20 hover:border-success/40 transition-colors"
                >
                  <div className="w-9 h-9 rounded-lg bg-success/20 flex items-center justify-center mb-2">
                    <item.icon className="w-5 h-5 text-success" />
                  </div>
                  <p className="text-xs font-semibold text-foreground leading-snug">
                    {item.text}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.section>

          {/* Tests in Package - Enhanced List */}
          {packageTests.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" />
                  Tests Included
                </h2>
                <Badge variant="outline" className="text-xs">
                  {packageTests.length} items
                </Badge>
              </div>
              <div className="max-h-80 overflow-y-auto rounded-xl border border-border/40 bg-muted/40 divide-y divide-border/40">
                {packageTests.map((test, index) => (
                  <motion.div
                    key={test.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + index * 0.02 }}
                    className="flex items-center gap-3 p-3 hover:bg-muted/80 transition-colors"
                  >
                    <div className="w-5 h-5 rounded-full bg-success/20 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-success" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {test.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {test.category}
                      </p>
                    </div>
                    <p className="text-xs font-semibold text-primary flex-shrink-0">
                      ₹{test.price}
                    </p>
                  </motion.div>
                ))}
              </div>
            </motion.section>
          )}

          {/* Lab Selection - Modern Card Layout */}
          {!packageData.lab_id && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h2 className="text-lg font-bold text-foreground mb-2 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                Choose Your Lab
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Select a lab to book this package
              </p>

              <div className="space-y-3">
                {labOptions.map((lab, index) => {
                  const labPrice = Math.round(packageData.price * lab.priceMultiplier);
                  const priceDiff = displayPrice - labPrice;

                  return (
                    <motion.button
                      key={lab.id}
                      type="button"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.35 + index * 0.05 }}
                      onClick={() => setSelectedLabId(lab.id)}
                      className={`w-full text-left transition-all duration-200 ${
                        selectedLabId === lab.id
                          ? "bg-gradient-to-r from-primary/15 to-primary/5 border-primary/60 border-2 shadow-md"
                          : "bg-white dark:bg-secondary/30 border border-border/40 hover:border-primary/30 hover:shadow-sm"
                      } rounded-xl p-4`}
                    >
                      <div className="flex gap-3">
                        {/* Logo/Avatar */}
                        <div
                          className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            selectedLabId === lab.id
                              ? "bg-primary/20"
                              : "bg-muted/50"
                          }`}
                        >
                          <Building2
                            className={`w-6 h-6 ${
                              selectedLabId === lab.id ? "text-primary" : "text-muted-foreground"
                            }`}
                          />
                        </div>

                        {/* Lab Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h3 className="font-semibold text-foreground text-sm">
                              {lab.name}
                            </h3>
                            {selectedLabId === lab.id && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="flex-shrink-0 w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center"
                              >
                                <Check className="w-3 h-3" />
                              </motion.div>
                            )}
                          </div>

                          {/* Rating and Reviews */}
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <div className="flex items-center gap-1">
                              <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                              <span className="text-xs font-semibold text-foreground">
                                {lab.rating}
                              </span>
                            </div>
                            <span className="text-[10px] text-muted-foreground">
                              {lab.reviews.toLocaleString()} reviews
                            </span>
                            <span className="text-[10px] text-muted-foreground">•</span>
                            <span className="text-[10px] text-muted-foreground">
                              {lab.reportTime}
                            </span>
                          </div>

                          {/* Features */}
                          {lab.homeCollection && (
                            <div className="inline-flex items-center gap-1 px-2 py-1 bg-success/10 rounded-md">
                              <Home className="w-3 h-3 text-success" />
                              <span className="text-[9px] font-semibold text-success">
                                Home Collection
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Price */}
                        <div className="text-right flex-shrink-0">
                          <p className="font-bold text-foreground">₹{labPrice}</p>
                          {priceDiff > 0 && (
                            <p className="text-[10px] text-success font-semibold">
                              Save ₹{priceDiff}
                            </p>
                          )}
                          {priceDiff < 0 && (
                            <p className="text-[10px] text-muted-foreground">
                              +₹{Math.abs(priceDiff)}
                            </p>
                          )}
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </motion.section>
          )}
        </div>

        {/* Pending Item Replace Dialog */}
        <AnimatePresence>
          {pendingItem && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 flex items-end"
            >
              <motion.div
                initial={{ y: 100 }}
                animate={{ y: 0 }}
                exit={{ y: 100 }}
                className="w-full bg-background rounded-t-3xl p-6 shadow-2xl"
              >
                <div className="w-12 h-1 bg-muted rounded-full mx-auto mb-4" />
                <h3 className="font-bold text-lg text-foreground mb-2">Replace Cart Items?</h3>
                <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                  Your cart has items from another lab. Do you want to replace them with this package?
                </p>
                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={cancelReplace}
                  >
                    Keep Both
                  </Button>
                  <Button
                    className="w-full bg-gradient-to-r from-primary to-primary/80"
                    onClick={handleConfirmReplace}
                  >
                    Replace Cart
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Add to Cart Button - Fixed Bottom Bar */}
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="fixed left-0 right-0 bg-gradient-to-t from-background via-background to-transparent border-t border-border/40 p-4 z-40"
        style={{
          bottom: "calc(env(safe-area-inset-bottom, var(--safe-area-inset-bottom, 0px)) + 72px)",
          paddingBottom: "calc(1rem + env(safe-area-inset-bottom, var(--safe-area-inset-bottom, 0px)))",
        }}
      >
        <div className="mx-auto max-w-lg">
          <Button
            className="w-full flex items-center justify-center gap-3 h-14 rounded-full shadow-xl text-base font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all px-5"
            onClick={handleAddToCart}
          >
            <div className="flex items-center gap-3">
              <ShoppingCart className="w-5 h-5" />
              <span>Add Package to Cart</span>
            </div>
          </Button>
        </div>
      </motion.div>
    </MobileLayout>
  );
};

export default PackageDetailScreen;
