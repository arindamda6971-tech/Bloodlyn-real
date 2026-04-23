import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Clock,
  FileText,
  Home,
  Shield,
  Sparkles,
  Check,
  Plus,
  Minus,
  ShoppingCart,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import MobileLayout from "@/components/layout/MobileLayout";
import ScreenHeader from "@/components/layout/ScreenHeader";
import LoadingSpinner from "@/components/ui/loading-spinner";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCart } from "@/contexts/CartContext";
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
  description: string | null;
  price: number;
  original_price: number | null;
  discount_percent: number | null;
  report_time_hours: number | null;
  sample_type: string | null;
  fasting_required: boolean | null;
  fasting_hours: number | null;
  preparation_instructions: string | null;
  parameters: any;
}

const defaultIncludes = [
  { icon: Home, text: "Home sample collection" },
  { icon: Shield, text: "NABL certified lab" },
  { icon: FileText, text: "Digital report" },
  { icon: Sparkles, text: "AI-powered insights" },
];

const TestDetailScreen = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [quantity, setQuantity] = useState(1);
  const [test, setTest] = useState<TestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addToCart, itemCount, pendingItem, confirmReplace, cancelReplace } = useCart();

  useEffect(() => {
    const fetchTest = async () => {
      if (!id) {
        setError("Test ID not provided");
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from("tests")
          .select("*")
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
  }, [id]);

  const handleAddToCart = () => {
    if (!test) return;
    let addedAny = false;
    for (let i = 0; i < quantity; i++) {
      const ok = addToCart({ id: test.id, name: test.name, price: test.price });
      if (!ok) break;
      addedAny = true;
    }
    if (addedAny) toast.success(`${test.name} added to cart!`);
  };

  const handleConfirmReplace = () => {
    confirmReplace();
    toast.success("Cart replaced with new lab items");
  };

  if (loading) {
    return (
      <MobileLayout showFloatingAdd={false}>
        <ScreenHeader title="Test Details" />
        <div className="flex items-center justify-center h-[60vh]">
          <LoadingSpinner size="lg" />
        </div>
      </MobileLayout>
    );
  }

  if (error || !test) {
    return (
      <MobileLayout showFloatingAdd={false}>
        <ScreenHeader title="Test Details" />
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

  const discount = test.discount_percent || 0;
  const originalPrice = test.original_price || test.price;
  const reportTime = test.report_time_hours ? `${test.report_time_hours} hours` : "24 hours";
  const parameters = Array.isArray(test.parameters) ? test.parameters : [];

  return (
    <MobileLayout showFloatingAdd={false}>
      <ScreenHeader
        title="Test Details"
        rightAction={
          <button onClick={() => navigate("/cart")} className="icon-btn relative">
            <ShoppingCart className="w-5 h-5 text-foreground" />
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                {itemCount > 9 ? "9+" : itemCount}
              </span>
            )}
          </button>
        }
      />

      <div className="px-4 pb-32">
        {/* Main info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4"
        >
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              {discount > 0 && (
                <Badge variant="softSuccess" className="mb-2">{discount}% OFF</Badge>
              )}
              <h1 className="text-xl font-bold text-foreground">{test.name}</h1>
            </div>
          </div>

          {test.description && (
            <p className="text-muted-foreground text-sm leading-relaxed mb-6">
              {test.description}
            </p>
          )}

          {/* Quick info */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="soft-card flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Report in</p>
                <p className="font-semibold text-foreground text-sm">{reportTime}</p>
              </div>
            </div>
            <div className="soft-card flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Fasting</p>
                <p className="font-semibold text-foreground text-sm">
                  {test.fasting_required ? `${test.fasting_hours || 8} hours` : "Not required"}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* AI Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-4 rounded-2xl bg-gradient-to-r from-primary/10 to-success/10 border border-primary/20 mb-6"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-success flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">AI will explain your report</p>
              <p className="text-xs text-muted-foreground">Get insights in simple language</p>
            </div>
            <Badge variant="ai">AI</Badge>
          </div>
        </motion.div>

        {/* What's included */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <h2 className="text-lg font-bold text-foreground mb-3">What's Included</h2>
          <div className="soft-card space-y-3">
            {defaultIncludes.map((item, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
                  <item.icon className="w-4 h-4 text-success" />
                </div>
                <span className="text-foreground text-sm">{item.text}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Parameters */}
        {parameters.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-6"
          >
            <h2 className="text-lg font-bold text-foreground mb-3">
              Parameters ({parameters.length})
            </h2>
            <div className="soft-card">
              <div className="flex flex-wrap gap-2">
                {parameters.map((param: any, index: number) => (
                  <div
                    key={index}
                    className="flex items-center gap-1.5 bg-muted px-3 py-1.5 rounded-full text-sm"
                  >
                    <Check className="w-3 h-3 text-success" />
                    <span className="text-foreground">
                      {typeof param === 'string' ? param : param.name || param}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Preparation Instructions */}
        {test.preparation_instructions && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="mb-6"
          >
            <h2 className="text-lg font-bold text-foreground mb-3">Preparation</h2>
            <div className="soft-card">
              <p className="text-sm text-muted-foreground">{test.preparation_instructions}</p>
            </div>
          </motion.div>
        )}

        {/* Pricing */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="soft-card mb-6"
        >
          <h2 className="text-lg font-bold text-foreground mb-3">Price Breakdown</h2>
          <div className="space-y-2">
            {discount > 0 && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Test Price</span>
                  <span className="text-foreground line-through">₹{originalPrice}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Discount ({discount}%)</span>
                  <span className="text-success">-₹{Math.round(originalPrice - test.price)}</span>
                </div>
              </>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Home Collection</span>
              <span className="text-success">FREE</span>
            </div>
            <div className="h-px bg-border my-3" />
            <div className="flex justify-between">
              <span className="font-semibold text-foreground">Total</span>
              <span className="font-bold text-lg text-foreground">₹{test.price * quantity}</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Bottom CTA */}
      <nav className="fixed bottom-14 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-24px)] max-w-[380px]">
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="flex items-center justify-around px-1 py-1.5 rounded-2xl backdrop-blur-xl bg-background/70 border border-border/30 shadow-md"
          style={{
            WebkitBackdropFilter: 'blur(16px)',
            backdropFilter: 'blur(16px)',
          }}
        >
          {/* Quantity selector */}
          <div className="flex items-center gap-0.5 bg-muted/50 rounded-xl px-1 py-0.5">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-6 h-6 rounded-lg bg-card flex items-center justify-center hover:bg-muted/50 transition-all"
            >
              <Minus className="w-3 h-3 text-muted-foreground" />
            </button>
            <span className="w-5 text-center text-xs font-medium text-foreground">{quantity}</span>
            <button
              onClick={() => setQuantity(quantity + 1)}
              className="w-6 h-6 rounded-lg bg-card flex items-center justify-center hover:bg-muted/50 transition-all"
            >
              <Plus className="w-3 h-3 text-muted-foreground" />
            </button>
          </div>

          {/* Add to cart */}
          <Button
            variant="hero"
            size="sm"
            className="text-[10px] px-4 py-1 h-7 rounded-xl"
            onClick={handleAddToCart}
          >
            <ShoppingCart className="w-3 h-3 mr-1" />
            Add to Cart
          </Button>
        </motion.div>
      </nav>

      {/* Lab Conflict Alert Dialog */}
      <AlertDialog open={!!pendingItem} onOpenChange={(open) => !open && cancelReplace()}>
        <AlertDialogContent className="max-w-[90%] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Change Lab?</AlertDialogTitle>
            <AlertDialogDescription>
              Changing labs will clear your current cart. Proceed?
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

export default TestDetailScreen;
