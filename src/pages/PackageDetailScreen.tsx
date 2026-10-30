import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Droplet,
  FlaskConical,
  Home,
  ShoppingCart,
  Users,
  Utensils,
} from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import MobileLayout from "@/components/layout/MobileLayout";
import ScreenHeader from "@/components/layout/ScreenHeader";
import LoadingSpinner from "@/components/ui/loading-spinner";
import { supabase } from "@/integrations/supabase/client";
import {
  audienceText,
  categoryLabel,
  fastingText,
  fetchPackage,
  formatHours,
  groupIncludedTests,
  sampleText,
  type IncludedTest,
} from "@/lib/health-packages";

/** Tests from the app's own catalogue, for packages synced before labs sent their test list. */
async function fetchCatalogueTests(packageId: string): Promise<IncludedTest[]> {
  const { data } = await supabase
    .from("package_tests")
    .select("tests!test_id (name, test_category)")
    .eq("package_id", packageId);
  return ((data as any[]) || [])
    .map((pt) => ({ name: pt.tests?.name, category: pt.tests?.test_category ?? null }))
    .filter((t) => typeof t.name === "string" && t.name);
}

const PackageDetailScreen = () => {
  const navigate = useNavigate();
  const { packageId } = useParams<{ packageId: string }>();
  const { addToCart, pendingItem, confirmReplace, cancelReplace, hasItem } = useCart();
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  const { data: pkg, isLoading, isError } = useQuery({
    queryKey: ["health-package", packageId],
    queryFn: () => fetchPackage(packageId!),
    enabled: !!packageId,
    staleTime: 5 * 60 * 1000,
  });
  const { data: catalogueTests = [] } = useQuery({
    queryKey: ["health-package-catalogue-tests", packageId],
    queryFn: () => fetchCatalogueTests(packageId!),
    enabled: !!pkg && pkg.includedTests.length === 0,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <MobileLayout showNav={false}>
        <ScreenHeader title="Package Details" />
        <div className="flex items-center justify-center h-[60vh]">
          <LoadingSpinner size="lg" />
        </div>
      </MobileLayout>
    );
  }

  if (isError || !pkg || !pkg.lab) {
    return (
      <MobileLayout showNav={false}>
        <ScreenHeader title="Package Details" />
        <div className="flex flex-col items-center justify-center h-[60vh] px-4 text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-2">
            {isError ? "Couldn't load this package" : "Package not found"}
          </h2>
          <p className="text-sm text-muted-foreground mb-4">It may have been removed by the lab.</p>
          <Button onClick={() => navigate("/packages")}>Browse packages</Button>
        </div>
      </MobileLayout>
    );
  }

  const lab = pkg.lab;
  const tests = pkg.includedTests.length > 0 ? pkg.includedTests : catalogueTests;
  const groups = groupIncludedTests(tests);
  const audience = audienceText(pkg);
  const sample = sampleText(pkg);
  const category = categoryLabel(pkg.category);
  const inCart = hasItem(pkg.id, pkg.name);

  const handleAddToCart = () => {
    const ok = addToCart({
      id: pkg.id,
      name: pkg.name,
      price: pkg.price,
      labId: lab.id,
      labName: lab.name,
      vendorId: lab.vendorId || undefined,
      kind: "package",
    });
    if (ok) navigate("/cart");
  };

  const facts = [
    { icon: FlaskConical, label: "Tests", value: `${pkg.testsCount}` },
    { icon: Utensils, label: "Preparation", value: fastingText(pkg) },
    ...(pkg.reportHours ? [{ icon: Clock, label: "Reports in", value: formatHours(pkg.reportHours) }] : []),
    ...(sample ? [{ icon: Droplet, label: "Sample", value: sample }] : []),
  ];

  return (
    <MobileLayout showNav={false}>
      <ScreenHeader title="Package Details" />

      <div className="pb-36">
        {/* Summary */}
        <section className="px-4 pt-5 pb-6 bg-gradient-to-b from-primary/10 to-background">
          <div className="flex flex-wrap gap-2 mb-3">
            {category && (
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-primary/10 text-primary">{category}</span>
            )}
            {pkg.isPopular && (
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">Popular</span>
            )}
          </div>
          <h1 className="text-2xl font-black text-foreground leading-tight">{pkg.name}</h1>
          {pkg.description && <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{pkg.description}</p>}

          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-foreground">₹{Math.round(pkg.price)}</span>
            {pkg.originalPrice && (
              <span className="text-base text-muted-foreground line-through">₹{Math.round(pkg.originalPrice)}</span>
            )}
            {pkg.discountPercent > 0 && (
              <span className="text-sm font-black text-emerald-600">{pkg.discountPercent}% off</span>
            )}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            {facts.map((f) => (
              <div key={f.label} className="flex items-center gap-2.5 rounded-2xl bg-white border border-border/50 px-3 py-2.5">
                <f.icon className="w-4 h-4 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{f.label}</p>
                  <p className="text-[13px] font-extrabold text-foreground truncate">{f.value}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* What's included */}
        <section className="px-4 mt-2">
          <h2 className="text-lg font-extrabold text-foreground">What's included</h2>
          {groups.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              {pkg.testsCount} {pkg.testsCount === 1 ? "test" : "tests"}. The lab hasn't listed them yet.
            </p>
          ) : (
            <div className="mt-3 rounded-2xl border border-border/60 divide-y divide-border/60 bg-white overflow-hidden">
              {groups.map((g) => {
                const open = openGroup === g.group || groups.length === 1;
                return (
                  <div key={g.group}>
                    <button
                      type="button"
                      onClick={() => setOpenGroup(open ? null : g.group)}
                      aria-expanded={open}
                      className="w-full flex items-center justify-between px-4 py-3.5 text-left"
                    >
                      <span className="text-sm font-bold text-foreground">{g.group}</span>
                      <span className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                        {g.tests.length} {g.tests.length === 1 ? "test" : "tests"}
                        <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} />
                      </span>
                    </button>
                    {open && (
                      <ul className="px-4 pb-3.5 space-y-2">
                        {g.tests.map((name) => (
                          <li key={name} className="flex items-start gap-2 text-[13px] text-foreground">
                            <Check className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                            {name}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Before you book */}
        <section className="px-4 mt-6">
          <h2 className="text-lg font-extrabold text-foreground">Before you book</h2>
          <ul className="mt-3 space-y-3">
            {audience && (
              <li className="flex items-start gap-3 text-sm">
                <Users className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <span><span className="font-bold">Recommended for:</span> {audience}</span>
              </li>
            )}
            <li className="flex items-start gap-3 text-sm">
              <Utensils className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <span>
                {pkg.fastingHours
                  ? `Don't eat for ${pkg.fastingHours} hours before the sample. Water is fine.`
                  : "No fasting needed. You can eat and drink as usual."}
              </span>
            </li>
            <li className="flex items-start gap-3 text-sm">
              <Home className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <span>A phlebotomist collects the sample at your address at the time you pick.</span>
            </li>
          </ul>
        </section>

        {/* Lab */}
        <section className="px-4 mt-6">
          <h2 className="text-lg font-extrabold text-foreground">Offered by</h2>
          <button
            type="button"
            onClick={() => navigate(`/lab/${lab.id}`)}
            className="mt-3 w-full flex items-center gap-3 rounded-2xl border border-border/60 bg-white p-3 text-left"
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
              {lab.logo ? <img src={lab.logo} alt="" className="w-full h-full object-cover" /> : <Building2 className="w-6 h-6 text-primary" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-extrabold text-foreground truncate">{lab.name}</p>
              <p className="text-xs text-muted-foreground">See the lab and its other tests</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </section>

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
                style={{ paddingBottom: "max(var(--sab), 24px)" }}
              >
                <div className="w-12 h-1 bg-muted rounded-full mx-auto mb-4" />
                <h3 className="font-bold text-lg text-foreground mb-2">Replace your cart?</h3>
                <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                  Your cart has items from another lab. One booking can only be from one lab.
                </p>
                <div className="flex flex-col gap-2">
                  <Button
                    className="w-full"
                    onClick={() => {
                      confirmReplace();
                      navigate("/cart");
                    }}
                  >
                    Replace with this package
                  </Button>
                  <Button variant="outline" className="w-full" onClick={cancelReplace}>
                    Keep my current cart
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Book bar */}
      <div
        className="fixed bottom-0 left-0 right-0 w-full md:max-w-[430px] mx-auto bg-background/95 backdrop-blur-md border-t border-border/40 px-4 pt-3 z-40 flex items-center gap-3"
        style={{ paddingBottom: "max(var(--sab), 12px)" }}
      >
        <div className="min-w-0">
          <p className="text-lg font-black text-foreground leading-none">₹{Math.round(pkg.price)}</p>
          <p className="text-[11px] text-muted-foreground mt-1 truncate">{pkg.testsCount} tests · {lab.name}</p>
        </div>
        <Button
          className="ml-auto h-12 rounded-full px-6 text-base font-semibold gap-2"
          onClick={inCart ? () => navigate("/cart") : handleAddToCart}
          variant={inCart ? "softSuccess" : "default"}
        >
          {inCart ? <Check className="w-5 h-5" /> : <ShoppingCart className="w-5 h-5" />}
          {inCart ? "View cart" : "Book now"}
        </Button>
      </div>
    </MobileLayout>
  );
};

export default PackageDetailScreen;
