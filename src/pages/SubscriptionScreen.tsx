import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Check,
  Crown,
  Star,
  Zap,
  Home,
  Stethoscope,
  HeadphonesIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import MobileLayout from "@/components/layout/MobileLayout";
import ScreenHeader from "@/components/layout/ScreenHeader";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const plans = [
  {
    id: "monthly",
    name: "Monthly",
    price: 29,
    period: "per month",
    popular: false,
  },
  {
    id: "yearly",
    name: "Yearly",
    price: 299,
    period: "per year",
    popular: true,
    savings: "Save ₹49",
  },
];

const features = [
  { icon: Home, text: "Unlimited free home sample collection" },
  { icon: Stethoscope, text: "2 free doctor consultations/month" },
  { icon: HeadphonesIcon, text: "Priority customer support" },
  { icon: Zap, text: "Express report delivery" },
  { icon: Star, text: "Exclusive member discounts (up to 30%)" },
];

const SubscriptionScreen = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { purchaseSubscription, isLoading: isSubscriptionLoading } = useSubscription();
  const [selectedPlan, setSelectedPlan] = useState("yearly");
  const [isPurchasing, setIsPurchasing] = useState(false);

  const handleBuyNow = async () => {
    if (!user) {
      toast.error("Please log in to purchase a subscription");
      navigate("/login");
      return;
    }

    try {
      setIsPurchasing(true);
      const selectedPlanData = plans.find(p => p.id === selectedPlan);
      
      if (!selectedPlanData) {
        toast.error("Invalid plan selected");
        return;
      }

      await purchaseSubscription(selectedPlan as "monthly" | "yearly");
      
      toast.success(`🎉 Welcome to BloodLyn Gold! Your ${selectedPlanData.name} subscription is active.`);
      
      // Navigate to profile after 1.5 seconds to show the toast
      setTimeout(() => {
        navigate("/profile");
      }, 1500);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to purchase subscription");
    } finally {
      setIsPurchasing(false);
    }
  };

  return (
    <MobileLayout showNav={false}>
       <ScreenHeader title="BloodLyn Subscription" />

      <div className="px-4 pb-32">
        {/* Hero section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 text-center"
        >
          <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-warning to-warning/60 flex items-center justify-center mb-4">
            <Crown className="w-10 h-10 text-warning-foreground" />
          </div>
           <h1 className="text-2xl font-bold text-foreground">BloodLyn Gold</h1>
          <p className="text-muted-foreground mt-2">
            Unlock gold health benefits with our subscription plans
          </p>
        </motion.div>

        {/* Plan selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-8 grid grid-cols-2 gap-3"
        >
          {plans.map((plan) => (
            <button
              key={plan.id}
              onClick={() => setSelectedPlan(plan.id)}
              className={`relative rounded-2xl border-2 transition-all ${
                plan.popular ? "pt-10 pb-4 px-4" : "p-4"
              } ${
                selectedPlan === plan.id
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card"
              }`}
            >
              {plan.popular && (
                <Badge
                  variant="ai"
                  className="absolute -top-4 left-1/2 -translate-x-1/2 z-10"
                >
                  Most Popular
                </Badge>
              )}
              <p
                className={`font-semibold text-foreground ${
                  plan.popular ? "mt-2" : ""
                }`}
              >
                {plan.name}
              </p>
              <p className="text-2xl font-bold text-foreground mt-2">
                ₹{plan.price}
              </p>
              <p className="text-xs text-muted-foreground">{plan.period}</p>
              {plan.savings && (
                <Badge variant="softSuccess" className="mt-2">
                  {plan.savings}
                </Badge>
              )}
            </button>
          ))}
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-8"
        >
          <h2 className="text-lg font-bold text-foreground mb-4">What's Included</h2>
          <div className="soft-card space-y-4">
            {features.map((feature, index) => (
              <motion.div
                key={feature.text}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + index * 0.05 }}
                className="flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <span className="flex-1 text-foreground text-sm">
                  {feature.text}
                </span>
                <Check className="w-5 h-5 text-success" />
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Testimonials */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8"
        >
          <h2 className="text-lg font-bold text-foreground mb-4">
            What Members Say
          </h2>
          <div className="flex gap-3 overflow-x-auto hide-scrollbar">
            {[
              {
                name: "Priya S.",
                text: "The free home collection alone is worth it! Saved so much time.",
                rating: 5,
              },
              {
                name: "Rahul M.",
                text: "Doctor consultations are incredibly helpful. Best investment!",
                rating: 5,
              },
              {
                name: "Ananya K.",
                text: "Love the express reports. Got my results in just 4 hours!",
                rating: 5,
              },
            ].map((testimonial, index) => (
              <div key={index} className="soft-card min-w-[260px] flex-shrink-0">
                <div className="flex gap-1 mb-2">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star
                      key={i}
                      className="w-4 h-4 text-warning fill-warning"
                    />
                  ))}
                </div>
                <p className="text-sm text-foreground mb-2">
                  "{testimonial.text}"
                </p>
                <p className="text-xs text-muted-foreground">- {testimonial.name}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Bottom CTA */}
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="fixed bottom-0 left-0 right-0 w-full md:max-w-[430px] mx-auto bg-/98 border-t border-border px-4 py-4 safe-area-bottom"
      >
        <Button
          variant="hero"
          className="w-full"
          size="lg"
          onClick={handleBuyNow}
          disabled={isPurchasing || isSubscriptionLoading}
        >
          {isPurchasing ? "Processing..." : "Buy Now"}
        </Button>
      </motion.div>
    </MobileLayout>
  );
};

export default SubscriptionScreen;
