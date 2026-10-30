import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  AlertCircle,
  CalendarCheck,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Droplet,
  FileText,
  FlaskConical,
  HeartPulse,
  Home,
  Pill,
  ShoppingCart,
  Sparkles,
  Thermometer,
  Users,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import MobileLayout from "@/components/layout/MobileLayout";
import ScreenHeader from "@/components/layout/ScreenHeader";
import LoadingSpinner from "@/components/ui/loading-spinner";
import { LabAvatar, LabOpenBadge, LabRating } from "@/components/labs/lab-display";
import { supabase } from "@/integrations/supabase/client";
import {
  audienceText,
  categoryLabel,
  fastingText,
  fetchPackage,
  formatHours,
  formatRupees,
  groupIncludedTests,
  prettyGroupName,
  sampleText,
  savings,
  type IncludedTest,
} from "@/lib/health-packages";

/** Up to this many tests are shown as one checklist; more are grouped. */
const FLAT_LIST_MAX = 8;

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  full_body: Activity,
  diabetes: Droplet,
  heart: HeartPulse,
  thyroid: Sparkles,
  women: Users,
  men: Users,
  senior: Users,
  vitamins: Pill,
  fever: Thermometer,
  liver_kidney: FlaskConical,
};

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
  const [openGroups, setOpenGroups] = useState<Set<string> | null>(null);

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
  const flat = tests.length <= FLAT_LIST_MAX;
  // The biggest group starts open; the rest open on tap.
  const opened = openGroups ?? new Set(groups.slice(0, 1).map((g) => g.group));
  const allOpen = groups.every((g) => opened.has(g.group));
  const toggleGroup = (group: string) => {
    const next = new Set(opened);
    if (next.has(group)) next.delete(group);
    else next.add(group);
    setOpenGroups(next);
  };
  const audience = audienceText(pkg);
  const sample = sampleText(pkg);
  const category = categoryLabel(pkg.category);
  const CategoryIcon = (pkg.category && CATEGORY_ICONS[pkg.category]) || FlaskConical;
  const saved = savings(pkg);
  const inCart = hasItem(pkg.id, pkg.name);

  const handleBook = () => {
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
    { icon: FlaskConical, label: "Tests", value: `${pkg.testsCount} included` },
    { icon: Utensils, label: "Preparation", value: fastingText(pkg) },
    ...(pkg.reportHours ? [{ icon: Clock, label: "Reports in", value: formatHours(pkg.reportHours) }] : []),
    ...(sample ? [{ icon: Droplet, label: "Sample", value: sample }] : []),
  ];

  const steps = [
    { icon: CalendarCheck, title: "Book a slot", text: "Pick a date and time" },
    { icon: Home, title: "Sample at home", text: "Collected at your address" },
    {
      icon: FileText,
      title: "Get your report",
      text: pkg.reportHours ? `In the app within ${formatHours(pkg.reportHours)}` : "In the app when ready",
    },
  ];

  return (
    <MobileLayout showNav={false}>
      <ScreenHeader title="Package Details" />

      <div className="pb-36">
        {/* Summary */}
        <section className="px-4 pt-4">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/15 via-primary/5 to-background border border-primary/10 p-5">
            <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-primary/10 pointer-events-none" />
            <div className="relative flex items-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center shrink-0">
                <CategoryIcon className="w-6 h-6 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap gap-1.5 mb-1.5">
                  {category && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white text-primary">{category}</span>
                  )}
                  {pkg.isPopular && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Popular</span>
                  )}
                </div>
                <h1 className="text-[22px] font-black text-foreground leading-tight break-words">{pkg.name}</h1>
                <p className="mt-1 text-xs font-semibold text-muted-foreground">
                  {pkg.testsCount} {pkg.testsCount === 1 ? "test" : "tests"} · by {lab.name}
                </p>
              </div>
            </div>

            {pkg.description && <p className="relative mt-3 text-sm text-muted-foreground leading-relaxed">{pkg.description}</p>}

            <div className="relative mt-4 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-3xl font-black text-foreground">{formatRupees(pkg.price)}</span>
              {pkg.originalPrice && (
                <span className="text-base text-muted-foreground line-through">{formatRupees(pkg.originalPrice)}</span>
              )}
              {pkg.discountPercent > 0 && (
                <span className="text-xs font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">{pkg.discountPercent}% off</span>
              )}
            </div>
            {saved > 0 && <p className="relative mt-1 text-xs font-bold text-emerald-700">You save {formatRupees(saved)}</p>}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            {facts.map((f) => (
              <div key={f.label} className="flex items-center gap-2.5 rounded-2xl bg-white border border-border/50 px-3 py-2.5">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <f.icon className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{f.label}</p>
                  <p className="text-[13px] font-extrabold text-foreground truncate">{f.value}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* What's included */}
        <section className="px-4 mt-7">
          <div className="flex items-end justify-between">
            <h2 className="text-lg font-extrabold text-foreground">What's included</h2>
            {!flat && groups.length > 1 && (
              <button
                type="button"
                onClick={() => setOpenGroups(allOpen ? new Set() : new Set(groups.map((g) => g.group)))}
                className="text-xs font-bold text-primary"
              >
                {allOpen ? "Collapse all" : "Expand all"}
              </button>
            )}
          </div>

          {tests.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              {pkg.testsCount} {pkg.testsCount === 1 ? "test" : "tests"}. The lab hasn't listed them yet.
            </p>
          ) : flat ? (
            <ul className="mt-3 rounded-2xl border border-border/60 bg-white divide-y divide-border/50">
              {tests.map((t) => (
                <li key={`${t.category}-${t.name}`} className="flex items-center gap-3 px-4 py-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5 text-emerald-700" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground">{t.name}</p>
                    {t.category && <p className="text-[11px] text-muted-foreground">{prettyGroupName(t.category)}</p>}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-3 rounded-2xl border border-border/60 divide-y divide-border/60 bg-white overflow-hidden">
              {groups.map((g) => {
                const open = opened.has(g.group);
                return (
                  <div key={g.group}>
                    <button
                      type="button"
                      onClick={() => toggleGroup(g.group)}
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

        {/* How it works */}
        <section className="px-4 mt-7">
          <h2 className="text-lg font-extrabold text-foreground">How it works</h2>
          <ol className="mt-3 grid grid-cols-3 gap-2">
            {steps.map((step, i) => (
              <li key={step.title} className="rounded-2xl bg-white border border-border/50 p-3 text-center">
                <div className="mx-auto w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                  <step.icon className="w-4 h-4 text-primary" />
                </div>
                <p className="mt-2 text-[10px] font-bold text-muted-foreground">STEP {i + 1}</p>
                <p className="text-[12px] font-extrabold text-foreground leading-tight">{step.title}</p>
                <p className="mt-0.5 text-[10.5px] text-muted-foreground leading-snug">{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Before you book */}
        <section className="px-4 mt-7">
          <h2 className="text-lg font-extrabold text-foreground">Before you book</h2>
          <div className="mt-3 rounded-2xl bg-amber-50/70 border border-amber-200/60 p-4 space-y-3">
            <p className="flex items-start gap-3 text-sm text-foreground">
              <Utensils className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
              <span>
                {pkg.fastingHours
                  ? `Don't eat for ${pkg.fastingHours} hours before the sample. Water is fine.`
                  : "No fasting needed. You can eat and drink as usual."}
              </span>
            </p>
            {audience && (
              <p className="flex items-start gap-3 text-sm text-foreground">
                <Users className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
                <span><span className="font-bold">Recommended for:</span> {audience}</span>
              </p>
            )}
          </div>
        </section>

        {/* Lab */}
        <section className="px-4 mt-7">
          <h2 className="text-lg font-extrabold text-foreground">Offered by</h2>
          <button
            type="button"
            onClick={() => navigate(`/lab/${lab.id}`)}
            className="mt-3 w-full flex items-center gap-3 rounded-2xl border border-border/60 bg-white p-3 text-left"
          >
            <LabAvatar name={lab.name} logoUrl={lab.logo} className="w-12 h-12 rounded-xl" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-extrabold text-foreground truncate">{lab.name}</p>
              <div className="mt-1 flex items-center gap-2 flex-wrap">
                <LabRating rating={lab.rating} reviews={lab.reviews} />
                <LabOpenBadge vendorId={lab.vendorId} isActive={lab.isActive} />
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
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
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-black text-foreground leading-none">{formatRupees(pkg.price)}</span>
            {pkg.originalPrice && (
              <span className="text-xs text-muted-foreground line-through">{formatRupees(pkg.originalPrice)}</span>
            )}
          </div>
          <p className="text-[11px] mt-1 truncate font-semibold text-emerald-700">
            {saved > 0 ? `You save ${formatRupees(saved)}` : `${pkg.testsCount} tests · home collection`}
          </p>
        </div>
        <Button
          className="ml-auto h-12 rounded-full px-6 text-base font-semibold gap-2"
          onClick={inCart ? () => navigate("/cart") : handleBook}
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
