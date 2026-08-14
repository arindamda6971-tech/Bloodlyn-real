import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Building2,
  Star,
  Clock,
  Shield,
  AlertCircle,
  ShoppingCart,
} from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import MobileLayout from "@/components/layout/MobileLayout";
import ScreenHeader from "@/components/layout/ScreenHeader";
import LoadingSpinner from "@/components/ui/loading-spinner";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TestData {
  id: string;
  name: string;
  price: number;
  original_price: number | null;
  discount_percent: number | null;
  report_time_hours: number | null;
  sample_type: string | null;
}

// Labs with pricing variations
const labs = [
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
];

const TestSelectionScreen = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const [test, setTest] = useState<TestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  

  // Check if test data was passed via state (for static tests)
  const stateTest = location.state?.test as TestData | undefined;

  useEffect(() => {
    const fetchTest = async () => {
      // If test data was passed via state, use it
      if (stateTest) {
        setTest(stateTest);
        setLoading(false);
        return;
      }

      if (!id) {
        setError("Test ID not provided");
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from("tests")
          .select("id, name, price, original_price, discount_percent, report_time_hours, sample_type")
          .eq("id", id)
          .maybeSingle();

        if (fetchError) {
          console.error("Error fetching test:", fetchError);
          setError("Failed to load test details");
        } else if (!data) {
          setError("Test not found");
        } else {
          setTest(data);
        }
      } catch (err) {
        console.error("Error:", err);
        setError("Something went wrong");
      } finally {
        setLoading(false);
      }
    };

    fetchTest();
  }, [id, stateTest]);

  

  const { addToCart, pendingItem, confirmReplace, cancelReplace } = useCart();

  const handleAddToCart = (labId: string, labName: string, labPrice: number) => {
    if (!test) return;
    const success = addToCart({ id: `${test.id}-${labId}`, name: test.name, price: labPrice, labId, labName });
    if (success) {
      toast.success(`${test.name} added to cart (${labName})`);
    }
  };

  const handleConfirmReplace = () => {
    confirmReplace();
    toast.success("Cart replaced with new lab items");
  };

  if (loading) {
    return (
      <MobileLayout>
        <ScreenHeader title="Select Lab" />
        <div className="flex items-center justify-center h-[60vh]">
          <LoadingSpinner size="lg" />
        </div>
      </MobileLayout>
    );
  }

  if (error || !test) {
    return (
      <MobileLayout>
        <ScreenHeader title="Select Lab" />
        <div className="flex flex-col items-center justify-center h-[60vh] px-4 text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-2">
            {error || "Test not found"}
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            The test you're looking for doesn't exist or has been removed.
          </p>
          <Button onClick={() => navigate("/categories")}>
            Browse Tests
          </Button>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <ScreenHeader title="Select Lab" />

      <div className="px-4 pb-32">
        {/* Test Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="soft-card mt-4"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {test.discount_percent && test.discount_percent > 0 && (
                <Badge variant="softSuccess" className="mb-2">{test.discount_percent}% OFF</Badge>
              )}
              <h1 className="text-lg font-bold text-foreground">{test.name}</h1>
              {test.sample_type && (
                <p className="text-sm text-muted-foreground mt-1">Sample: {test.sample_type}</p>
              )}
            </div>
            <div className="text-right">
              <p className="font-bold text-lg text-foreground">₹{test.price}</p>
              {test.original_price && test.original_price > test.price && (
                <p className="text-xs text-muted-foreground line-through">₹{test.original_price}</p>
              )}
            </div>
          </div>
        </motion.div>

        {/* Lab Selection Header */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mt-6 mb-4"
        >
          <h2 className="text-lg font-bold text-foreground">Choose Your Favourite Lab</h2>
          <p className="text-sm text-muted-foreground">Select a lab to book this test</p>
        </motion.div>

        {/* Lab Options */}
        <div className="space-y-3 list-virtual-lg">
          {labs.map((lab, index) => {
            const labPrice = Math.round(test.price * lab.priceMultiplier);

            return (
              <motion.div
                key={lab.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.05 }}
                className={`soft-card cursor-pointer transition-all hover:border-primary/50`}
              >
                <div className="flex items-start gap-3">

                  {/* Lab icon */}
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-6 h-6 text-primary" />
                  </div>

                  {/* Lab info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-foreground text-sm truncate">{lab.name}</h3>
                      {lab.accredited && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">NABL</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                      <div className="flex items-center gap-0.5">
                        <Star className="w-3 h-3 text-warning fill-warning" />
                        <span>{lab.rating}</span>
                      </div>
                      <span>•</span>
                      <span>{lab.reviews.toLocaleString()} reviews</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>{lab.reportTime}</span>
                      </div>
                      {lab.homeCollection && (
                        <div className="flex items-center gap-1 text-success">
                          <Shield className="w-3 h-3" />
                          <span>Home Collection</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Price */}
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-foreground">₹{labPrice}</p>
                    {lab.priceMultiplier < 1 && (
                      <p className="text-[10px] text-success">Save ₹{Math.round(test.price - labPrice)}</p>
                    )}
                    <div className="mt-2 flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); handleAddToCart(lab.id, lab.name, labPrice); }}
                        className="px-3"
                      >
                        <ShoppingCart className="w-3 h-3 mr-1" />
                        Add
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Lab Conflict Alert Dialog */}
      <AlertDialog open={!!pendingItem} onOpenChange={(open) => !open && cancelReplace()}>
        <AlertDialogContent className="max-w-[90%] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Different Lab Selected</AlertDialogTitle>
            <AlertDialogDescription>
              You have added some tests from <span className="font-semibold text-foreground">{pendingItem?.existingLabName}</span>. 
              You can't add tests from another lab at the same time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-2">
            <AlertDialogCancel className="flex-1 mt-0" onClick={cancelReplace}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction className="flex-1" onClick={handleConfirmReplace}>
              Replace Cart
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
    </MobileLayout>
  );
};

export default TestSelectionScreen;
