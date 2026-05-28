import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import LabBanner from "@/components/labs/LabBanner";
import {
  Building2,
  Star,
  MapPin,
  Clock,
  Search,
  ShoppingCart,
  Plus,
  Check,
  Beaker,
  BadgeCheck,
  Home,
  Phone,
  ChevronRight,
  Shield,
  Zap,
  Award,
  Heart,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ScreenHeader from "@/components/layout/ScreenHeader";
import MobileLayout from "@/components/layout/MobileLayout";
import StickySearch from "@/components/ui/StickySearch";
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
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// Lab brand data for visual identity
const labBrandData: Record<string, { 
  logo: string; 
  bannerGradient: string;
  bannerImage: string;
  tagline: string;
  accentColor: string;
}> = {
  "Dr. Lal PathLabs": {
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Dr_Lal_PathLabs_logo.svg/200px-Dr_Lal_PathLabs_logo.svg.png",
    bannerGradient: "from-[#003087] via-[#0052cc] to-[#0073e6]",
    bannerImage: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800&q=80",
    tagline: "India's Most Trusted Lab",
    accentColor: "#0052cc"
  },
  "Thyrocare": {
    logo: "https://www.thyrocare.com/NewAssets2/images/thyrocare-logo.png",
    bannerGradient: "from-[#6b21a8] via-[#7c3aed] to-[#8b5cf6]",
    bannerImage: "https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=800&q=80",
    tagline: "Quality at Affordable Prices",
    accentColor: "#7c3aed"
  },
  "Metropolis Healthcare": {
    logo: "https://www.metropolisindia.com/assets/images/metropolis-logo-new.svg",
    bannerGradient: "from-[#0d9488] via-[#14b8a6] to-[#2dd4bf]",
    bannerImage: "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=800&q=80",
    tagline: "Pathology Experts Since 1980",
    accentColor: "#14b8a6"
  },
  "SRL Diagnostics": {
    logo: "https://www.srlworld.com/assets/images/srl-logo.svg",
    bannerGradient: "from-[#b91c1c] via-[#dc2626] to-[#ef4444]",
    bannerImage: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&q=80",
    tagline: "Excellence in Diagnostics",
    accentColor: "#dc2626"
  },
  "Apollo Diagnostics": {
    logo: "https://www.apollodiagnostics.in/assets/images/apollo-logo.png",
    bannerGradient: "from-[#0369a1] via-[#0284c7] to-[#38bdf8]",
    bannerImage: "https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=800&q=80",
    tagline: "Healthcare You Can Trust",
    accentColor: "#0284c7"
  },
  "LifeCare Diagnostics": {
    logo: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=100&q=80",
    bannerGradient: "from-[#047857] via-[#059669] to-[#10b981]",
    bannerImage: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800&q=80",
    tagline: "Quality Care, Affordable Prices",
    accentColor: "#059669"
  },
};

// Fallback gradients for unknown labs
const fallbackThemes = [
  { gradient: "from-[#1e40af] via-[#3b82f6] to-[#60a5fa]", tagline: "Trusted Health Partner" },
  { gradient: "from-[#7e22ce] via-[#a855f7] to-[#c084fc]", tagline: "Accurate Results, Fast" },
  { gradient: "from-[#059669] via-[#10b981] to-[#34d399]", tagline: "Your Health, Our Priority" },
  { gradient: "from-[#ea580c] via-[#f97316] to-[#fb923c]", tagline: "Advanced Diagnostics" },
  { gradient: "from-[#be185d] via-[#ec4899] to-[#f472b6]", tagline: "Precision Healthcare" },
];

// Lab data with test catalogs
const labsData: Record<string, {
  name: string;
  rating: number;
  reviews: number;
  location: string;
  timing: string;
  homeCollection: boolean;
  accredited: string[];
  tests: { id: string; name: string; price: number; originalPrice?: number; category: string; popular?: boolean }[];
}> = {
  "lal-pathlabs": {
    name: "Dr. Lal PathLabs",
    rating: 4.8,
    reviews: 12500,
    location: "Pan India - 280+ Centers",
    timing: "6:00 AM - 10:00 PM",
    homeCollection: true,
    accredited: ["NABL", "CAP"],
    tests: [
      { id: "lpl1", name: "Complete Blood Count (CBC)", price: 340, originalPrice: 450, category: "Blood Tests", popular: true },
      { id: "lpl2", name: "Lipid Profile", price: 520, originalPrice: 650, category: "Heart Health", popular: true },
      { id: "lpl3", name: "Liver Function Test (LFT)", price: 680, originalPrice: 850, category: "Liver Health" },
      { id: "lpl4", name: "Kidney Function Test (KFT)", price: 620, originalPrice: 780, category: "Kidney Health" },
      { id: "lpl5", name: "Thyroid Profile (T3, T4, TSH)", price: 540, originalPrice: 700, category: "Thyroid", popular: true },
      { id: "lpl6", name: "HbA1c (Glycated Hemoglobin)", price: 450, originalPrice: 580, category: "Diabetes" },
      { id: "lpl7", name: "Vitamin D (25-OH)", price: 1200, originalPrice: 1500, category: "Vitamins", popular: true },
      { id: "lpl8", name: "Vitamin B12", price: 780, originalPrice: 950, category: "Vitamins" },
      { id: "lpl9", name: "Iron Studies", price: 850, originalPrice: 1050, category: "Blood Tests" },
      { id: "lpl10", name: "Urine Routine & Microscopy", price: 180, originalPrice: 250, category: "Urine Tests" },
      { id: "lpl11", name: "Blood Sugar Fasting", price: 80, originalPrice: 120, category: "Diabetes" },
      { id: "lpl12", name: "Blood Sugar PP", price: 80, originalPrice: 120, category: "Diabetes" },
      { id: "lpl13", name: "Creatinine, Serum", price: 220, originalPrice: 300, category: "Kidney Health" },
      { id: "lpl14", name: "Uric Acid, Serum", price: 200, originalPrice: 280, category: "Joint Health" },
      { id: "lpl15", name: "ESR (Erythrocyte Sedimentation Rate)", price: 120, originalPrice: 180, category: "Blood Tests" },
      { id: "lpl16", name: "Hemoglobin", price: 90, originalPrice: 140, category: "Blood Tests" },
      { id: "lpl17", name: "Aarogyam Basic", price: 999, originalPrice: 2100, category: "Health Packages", popular: true },
      { id: "lpl18", name: "Aarogyam 1.3", price: 1799, originalPrice: 4000, category: "Health Packages" },
      { id: "lpl19", name: "Aarogyam Full Body Checkup", price: 2999, originalPrice: 6500, category: "Health Packages", popular: true },
      { id: "lpl20", name: "Swasthfit Basic", price: 599, originalPrice: 1200, category: "Health Packages" },
    ],
  },
  "metropolis": {
    name: "Metropolis Healthcare",
    rating: 4.7,
    reviews: 9800,
    location: "Pan India - 200+ Centers",
    timing: "7:00 AM - 9:00 PM",
    homeCollection: true,
    accredited: ["NABL", "CAP", "ISO"],
    tests: [
      { id: "met1", name: "Complete Blood Count", price: 380, originalPrice: 500, category: "Blood Tests", popular: true },
      { id: "met2", name: "Lipid Profile", price: 580, originalPrice: 750, category: "Heart Health" },
      { id: "met3", name: "Liver Function Test", price: 720, originalPrice: 900, category: "Liver Health" },
      { id: "met4", name: "Kidney Function Test", price: 680, originalPrice: 850, category: "Kidney Health" },
      { id: "met5", name: "Thyroid Profile Total", price: 600, originalPrice: 800, category: "Thyroid", popular: true },
      { id: "met6", name: "HbA1c", price: 500, originalPrice: 650, category: "Diabetes" },
      { id: "met7", name: "Vitamin D Total", price: 1350, originalPrice: 1700, category: "Vitamins", popular: true },
      { id: "met8", name: "Vitamin B12", price: 850, originalPrice: 1100, category: "Vitamins" },
      { id: "met9", name: "Ferritin", price: 650, originalPrice: 850, category: "Blood Tests" },
      { id: "met10", name: "CRP (C-Reactive Protein)", price: 450, originalPrice: 600, category: "Inflammation" },
      { id: "met11", name: "Glucose Fasting", price: 100, originalPrice: 150, category: "Diabetes" },
      { id: "met12", name: "Glucose PP", price: 100, originalPrice: 150, category: "Diabetes" },
      { id: "met13", name: "Uric Acid", price: 240, originalPrice: 320, category: "Joint Health" },
      { id: "met14", name: "Calcium, Total", price: 280, originalPrice: 380, category: "Bone Health" },
      { id: "met15", name: "Full Body Checkup Basic", price: 1499, originalPrice: 3000, category: "Health Packages", popular: true },
      { id: "met16", name: "Full Body Checkup Advanced", price: 2999, originalPrice: 5500, category: "Health Packages" },
      { id: "met17", name: "Heart Health Package", price: 1999, originalPrice: 4000, category: "Health Packages" },
      { id: "met18", name: "Diabetes Care Package", price: 1299, originalPrice: 2800, category: "Health Packages" },
    ],
  },
  "srl": {
    name: "SRL Diagnostics",
    rating: 4.6,
    reviews: 8500,
    location: "Pan India - 420+ Centers",
    timing: "6:30 AM - 9:30 PM",
    homeCollection: true,
    accredited: ["NABL", "CAP"],
    tests: [
      { id: "srl1", name: "Complete Hemogram", price: 350, originalPrice: 480, category: "Blood Tests", popular: true },
      { id: "srl2", name: "Lipid Profile Standard", price: 550, originalPrice: 720, category: "Heart Health" },
      { id: "srl3", name: "LFT (Liver Function)", price: 700, originalPrice: 900, category: "Liver Health" },
      { id: "srl4", name: "RFT (Renal Function)", price: 650, originalPrice: 820, category: "Kidney Health" },
      { id: "srl5", name: "Thyroid Function Test", price: 580, originalPrice: 750, category: "Thyroid", popular: true },
      { id: "srl6", name: "Glycated Hemoglobin", price: 480, originalPrice: 620, category: "Diabetes" },
      { id: "srl7", name: "25-OH Vitamin D", price: 1250, originalPrice: 1600, category: "Vitamins", popular: true },
      { id: "srl8", name: "Vitamin B12 Assay", price: 800, originalPrice: 1000, category: "Vitamins" },
      { id: "srl9", name: "Serum Iron", price: 350, originalPrice: 480, category: "Blood Tests" },
      { id: "srl10", name: "Homocysteine", price: 950, originalPrice: 1200, category: "Heart Health" },
      { id: "srl11", name: "Fasting Blood Sugar", price: 90, originalPrice: 140, category: "Diabetes" },
      { id: "srl12", name: "Creatinine", price: 200, originalPrice: 280, category: "Kidney Health" },
      { id: "srl13", name: "Uric Acid Blood", price: 220, originalPrice: 300, category: "Joint Health" },
      { id: "srl14", name: "ProHealth Basic", price: 1199, originalPrice: 2500, category: "Health Packages", popular: true },
      { id: "srl15", name: "ProHealth Essential", price: 2199, originalPrice: 4500, category: "Health Packages" },
      { id: "srl16", name: "ProHealth Comprehensive", price: 3499, originalPrice: 7000, category: "Health Packages" },
      { id: "srl17", name: "Senior Citizen Package", price: 2799, originalPrice: 5500, category: "Health Packages" },
    ],
  },
  "thyrocare": {
    name: "Thyrocare",
    rating: 4.5,
    reviews: 15000,
    location: "Pan India - 1200+ Centers",
    timing: "6:00 AM - 11:00 PM",
    homeCollection: true,
    accredited: ["NABL", "ISO"],
    tests: [
      { id: "thy1", name: "Aarogyam 1.1", price: 549, originalPrice: 1100, category: "Health Packages", popular: true },
      { id: "thy2", name: "Aarogyam 1.3", price: 799, originalPrice: 1600, category: "Health Packages", popular: true },
      { id: "thy3", name: "Aarogyam 1.8", price: 1199, originalPrice: 2400, category: "Health Packages" },
      { id: "thy4", name: "Aarogyam C", price: 1999, originalPrice: 4000, category: "Health Packages", popular: true },
      { id: "thy5", name: "Complete Blood Count", price: 280, originalPrice: 400, category: "Blood Tests" },
      { id: "thy6", name: "Thyroid Profile Total", price: 399, originalPrice: 600, category: "Thyroid", popular: true },
      { id: "thy7", name: "Lipid Profile", price: 399, originalPrice: 550, category: "Heart Health" },
      { id: "thy8", name: "Liver Function Test", price: 549, originalPrice: 750, category: "Liver Health" },
      { id: "thy9", name: "Kidney Function Test", price: 499, originalPrice: 700, category: "Kidney Health" },
      { id: "thy10", name: "Vitamin D 25-Hydroxy", price: 899, originalPrice: 1200, category: "Vitamins" },
      { id: "thy11", name: "Vitamin B12", price: 599, originalPrice: 850, category: "Vitamins" },
      { id: "thy12", name: "HbA1c", price: 349, originalPrice: 500, category: "Diabetes" },
      { id: "thy13", name: "Iron Deficiency Profile", price: 649, originalPrice: 900, category: "Blood Tests" },
      { id: "thy14", name: "Diabetes Screening", price: 299, originalPrice: 450, category: "Diabetes" },
      { id: "thy15", name: "Full Body Checkup", price: 999, originalPrice: 2000, category: "Health Packages" },
    ],
  },
  "apollo": {
    name: "Apollo Diagnostics",
    rating: 4.7,
    reviews: 7200,
    location: "Pan India - 150+ Centers",
    timing: "7:00 AM - 8:00 PM",
    homeCollection: true,
    accredited: ["NABL", "JCI"],
    tests: [
      { id: "apo1", name: "Complete Blood Picture", price: 400, originalPrice: 550, category: "Blood Tests", popular: true },
      { id: "apo2", name: "Lipid Profile", price: 600, originalPrice: 800, category: "Heart Health" },
      { id: "apo3", name: "Liver Function Tests", price: 750, originalPrice: 950, category: "Liver Health" },
      { id: "apo4", name: "Renal Function Tests", price: 700, originalPrice: 900, category: "Kidney Health" },
      { id: "apo5", name: "Thyroid Profile", price: 650, originalPrice: 850, category: "Thyroid", popular: true },
      { id: "apo6", name: "HbA1c Test", price: 550, originalPrice: 700, category: "Diabetes" },
      { id: "apo7", name: "Vitamin D3", price: 1400, originalPrice: 1800, category: "Vitamins", popular: true },
      { id: "apo8", name: "Vitamin B12", price: 900, originalPrice: 1150, category: "Vitamins" },
      { id: "apo9", name: "Ferritin Test", price: 700, originalPrice: 900, category: "Blood Tests" },
      { id: "apo10", name: "Apollo Basic Health Check", price: 1599, originalPrice: 3200, category: "Health Packages", popular: true },
      { id: "apo11", name: "Apollo Comprehensive Health Check", price: 3499, originalPrice: 7000, category: "Health Packages" },
      { id: "apo12", name: "Apollo Heart Care Package", price: 2299, originalPrice: 4500, category: "Health Packages" },
      { id: "apo13", name: "Apollo Women's Health Package", price: 2799, originalPrice: 5500, category: "Health Packages" },
      { id: "apo14", name: "Apollo Senior Citizen Package", price: 3199, originalPrice: 6500, category: "Health Packages" },
    ],
  },
};

// Map database IDs to local data keys
const dbIdToLocalId: Record<string, string> = {
  "dr-lal-pathlabs": "lal-pathlabs",
  "thyrocare": "thyrocare",
  "metropolis-healthcare": "metropolis",
  "srl-diagnostics": "srl",
  "apollo-diagnostics": "apollo",
};

type TabKey = "all" | "packages";
const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "All Tests" },
  { key: "packages", label: "Health Packages" },
];

interface DiagnosticCenter {
  id: string;
  name: string;
  address: string;
  city: string;
  rating: number | null;
  reviews_count: number | null;
  opening_time: string | null;
  closing_time: string | null;
  home_collection_available: boolean | null;
  logo_url: string | null;
  phone: string | null;
  vendor_id: string | null;
  available_tests: string[] | null;
  pricing: Record<string, number> | null;
  is_active: boolean | null;
}

interface DynamicTest {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  category: string;
  popular?: boolean;
  description?: string;
  testsCount?: number;
  discountPercent?: number;
}

const LabDetailScreen = () => {
  const { labId } = useParams<{ labId: string }>();
  const navigate = useNavigate();
  const { addToCart, pendingItem, confirmReplace, cancelReplace } = useCart();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [addedTests, setAddedTests] = useState<Set<string>>(new Set());
  const [expandedTest, setExpandedTest] = useState<string | null>(null);
  const [labFromDb, setLabFromDb] = useState<DiagnosticCenter | null>(null);
  const [dynamicTests, setDynamicTests] = useState<DynamicTest[]>([]);
  const [isLoading, setIsLoading] = useState(true);


  // Try to fetch lab from database first
  useEffect(() => {
    const fetchLabFromDb = async () => {
      if (!labId) return;

      try {
        const { data, error } = await supabase
          .from('diagnostic_centers')
          .select('id, name, address, city, rating, reviews_count, opening_time, closing_time, home_collection_available, logo_url, phone, vendor_id, available_tests, pricing, is_active')
          .eq('id', labId)
          .maybeSingle();

        if (!error && data) {
          setLabFromDb(data as DiagnosticCenter);

          let allDynamicTests: DynamicTest[] = [];

          if (data.vendor_id) {
            const { data: products } = await supabase
              .from('products')
              .select('*')
              .eq('vendor_id', data.vendor_id)
              .eq('availability', true);

            if (products && products.length > 0) {
              allDynamicTests = products.map((p) => ({
                id: p.id,
                name: p.name || p.product_name,
                price: Number(p.price),
                category: p.category || 'Blood Tests',
                popular: false,
              }));
            }
          }

          if (allDynamicTests.length === 0) {
            const availableTests = data.available_tests as string[] | null;
            const pricing = data.pricing as Record<string, number> | null;

            if (availableTests && availableTests.length > 0 && pricing) {
              allDynamicTests = availableTests.map((testName, idx) => ({
                id: `dc-${data.id}-${idx}`,
                name: testName,
                price: pricing[testName] || 299,
                category: categorizeTest(testName),
                popular: idx < 3,
              }));
            }
          }

          if (allDynamicTests.length > 0) {
            setDynamicTests(allDynamicTests);
          }
        }
      } catch (err) {
        console.error('Error fetching lab:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLabFromDb();
  }, [labId]);

  // Separate health-packages fetch + realtime subscription tied to the diagnostic center
  const [packages, setPackages] = useState<DynamicTest[]>([]);
  useEffect(() => {
    const centerId = labFromDb?.id || labId;
    if (!centerId) return;

    const loadPackages = async () => {
      const { data, error } = await supabase
        .from('test_packages')
        .select('id, name, description, price, original_price, discount_percent, tests_count, is_popular, is_active, diagnostic_center_id')
        .eq('diagnostic_center_id', centerId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (error) {
        console.warn('test_packages fetch error:', error.message);
        return;
      }
      setPackages(
        (data || []).map((pkg) => ({
          id: pkg.id,
          name: pkg.name,
          price: Number(pkg.price),
          originalPrice: pkg.original_price ? Number(pkg.original_price) : undefined,
          category: 'Health Packages',
          popular: pkg.is_popular || false,
          description: pkg.description || undefined,
          testsCount: pkg.tests_count || undefined,
          discountPercent: pkg.discount_percent || undefined,
        }))
      );
    };

    loadPackages();

    const channel = supabase
      .channel(`test_packages-${centerId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'test_packages', filter: `diagnostic_center_id=eq.${centerId}` },
        () => loadPackages()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [labFromDb?.id, labId]);


  // Categorize test based on name
  const categorizeTest = (testName: string): string => {
    const name = testName.toLowerCase();
    if (name.includes('blood') || name.includes('cbc') || name.includes('hemoglobin') || name.includes('esr')) return 'Blood Tests';
    if (name.includes('thyroid') || name.includes('t3') || name.includes('t4') || name.includes('tsh')) return 'Thyroid';
    if (name.includes('liver') || name.includes('lft') || name.includes('sgpt') || name.includes('sgot')) return 'Liver Health';
    if (name.includes('kidney') || name.includes('kft') || name.includes('creatinine') || name.includes('urea')) return 'Kidney Health';
    if (name.includes('sugar') || name.includes('glucose') || name.includes('hba1c') || name.includes('diabetes')) return 'Diabetes';
    if (name.includes('lipid') || name.includes('cholesterol') || name.includes('heart')) return 'Heart Health';
    if (name.includes('vitamin')) return 'Vitamins';
    if (name.includes('urine')) return 'Urine Tests';
    if (name.includes('package') || name.includes('checkup') || name.includes('profile')) return 'Health Packages';
    return 'Blood Tests';
  };

  // Get lab data - prefer database, fallback to hardcoded
  const getLabData = () => {
    if (labFromDb) {
      // Find matching local data for tests
      const localKey = Object.entries(dbIdToLocalId).find(([dbKey]) => 
        labFromDb.name.toLowerCase().includes(dbKey.split('-')[0])
      )?.[1];
      
      const localData = localKey ? labsData[localKey] : null;
      
      // Use dynamic tests if available, otherwise fall back to local data
      const baseTests = dynamicTests.length > 0
        ? dynamicTests
        : (localData?.tests || labsData["lal-pathlabs"].tests);
      // Strip any locally-derived "Health Packages" so DB-synced packages are the source of truth
      const nonPackageBase = baseTests.filter((t) => t.category !== "Health Packages");
      const testsToUse = [...nonPackageBase, ...packages];
      
      return {
        name: labFromDb.name,
        rating: labFromDb.rating || 4.5,
        reviews: labFromDb.reviews_count || 1000,
        location: `${labFromDb.address}, ${labFromDb.city}`,
        timing: `${labFromDb.opening_time || '7:00 AM'} - ${labFromDb.closing_time || '9:00 PM'}`,
        homeCollection: labFromDb.home_collection_available ?? true,
        accredited: ["NABL"],
        tests: testsToUse,
        phone: labFromDb.phone,
        logoUrl: labFromDb.logo_url,
        vendorId: labFromDb.vendor_id,
        isActive: labFromDb.is_active !== false,
      };
    }
    
    // Fallback to hardcoded data
    const localId = labId ? (dbIdToLocalId[labId] || labId) : null;
    return localId ? labsData[localId] : null;
  };

  const lab = getLabData();
  const isClosed = !!(lab && 'isActive' in lab && !(lab as any).isActive);

  if (isLoading) {
    return (
      <MobileLayout showNav={false} showFloatingAdd={false}>
        <ScreenHeader title="Loading..." />
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-muted-foreground mt-4">Loading lab details...</p>
        </div>
      </MobileLayout>
    );
  }

  if (!lab) {
    return (
      <MobileLayout showNav={false} showFloatingAdd={false}>
        <ScreenHeader title="Lab Not Found" />
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <Building2 className="w-16 h-16 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Lab not found</p>
          <Button className="mt-4" onClick={() => navigate("/partner-labs")}>
            Back to Labs
          </Button>
        </div>
      </MobileLayout>
    );
  }

  const packageCount = lab.tests.filter((t) => t.category === "Health Packages").length;
  const allTestsCount = lab.tests.length - packageCount;
  const filteredTests = lab.tests.filter((test) => {
    const matchesSearch = test.name.toLowerCase().includes(searchQuery.toLowerCase());
    const isPackage = test.category === "Health Packages";
    const matchesTab = activeTab === "packages" ? isPackage : !isPackage;
    return matchesSearch && matchesTab;
  });

  const handleAddTest = (testId: string, testName: string) => {
    setAddedTests((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(testId)) {
        newSet.delete(testId);
        toast.info(`${testName} removed from cart`);
      } else {
        newSet.add(testId);
        const test = lab.tests.find((t) => t.id === testId);
        if (test) {
          const ok = addToCart({
            id: testId,
            name: testName,
            price: test.price,
            labId: labId || "",
            labName: lab.name,
            vendorId: (lab as { vendorId?: string | null }).vendorId || undefined,
          });
          if (ok) {
            toast.success(`${testName} added to cart`);
          }
        }
      }
      return newSet;
    });
  };

  const handleConfirmReplace = () => {
    confirmReplace();
    toast.success("Cart replaced with new lab items");
  };

  // Get visual theme for lab
  const brandData = labBrandData[lab.name];
  const fallbackTheme = fallbackThemes[Math.abs(lab.name.charCodeAt(0) % fallbackThemes.length)];
  const bannerGradient = brandData?.bannerGradient || fallbackTheme.gradient;
  const tagline = brandData?.tagline || fallbackTheme.tagline;
  const logoUrl = brandData?.logo || (labFromDb?.logo_url) || null;

  return (
    <MobileLayout showNav={false} showFloatingAdd={false}>
      <ScreenHeader title="" />

      <div className="pb-24">
        {/* Hero Banner — SVG, instant render */}
        <div className="px-4 pt-4">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`relative overflow-hidden rounded-3xl shadow-2xl ${isClosed ? 'grayscale' : ''}`}
            style={{ minHeight: '200px' }}
          >
            {/* SVG banner — no image fetch */}
            <LabBanner labName={lab.name} />
            {/* Dark Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10" />

            {/* Content */}
            <div className="relative p-5 flex flex-col h-full min-h-[200px]">
              {/* Top Badges */}
              <div className="flex items-center justify-between mb-3">
                <motion.div 
                  className="flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/30"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <Zap className="w-3.5 h-3.5 text-yellow-300 fill-yellow-300" />
                  <span className="text-xs font-bold text-white">Up to 40% OFF</span>
                </motion.div>
                <div className="flex items-center gap-1 bg-white/15 backdrop-blur-sm px-2.5 py-1 rounded-full">
                  <BadgeCheck className="w-3.5 h-3.5 text-green-300" />
                  <span className="text-[10px] font-medium text-white/90">{lab.accredited.join(" & ")} Certified</span>
                </div>
              </div>
              
              {/* Main Content Row */}
              <div className="flex items-center gap-4 flex-1">
                {/* Logo Container */}
                <div className="relative">
                  <div className="w-20 h-20 rounded-2xl bg-white flex items-center justify-center flex-shrink-0 shadow-xl border-2 border-white/50 overflow-hidden">
                    {logoUrl ? (
                      <img 
                        src={logoUrl} 
                        alt={lab.name} 
                        className="w-16 h-16 object-contain p-1"
                        loading="lazy"
                        decoding="async"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling?.classList.remove('hidden');
                        }}
                      />

                    ) : null}
                    <Building2 className={`w-10 h-10 text-gray-600 ${logoUrl ? 'hidden' : ''}`} />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white shadow-lg flex items-center justify-center">
                    <Shield className="w-4 h-4 text-primary" />
                  </div>
                </div>
                
                {/* Lab Info */}
                <div className="flex-1 min-w-0">
                  <h1 className="font-bold text-white text-lg leading-tight line-clamp-1 drop-shadow-md">
                    {lab.name}
                  </h1>
                  <p className="text-white/80 text-xs font-medium mt-0.5 italic">"{tagline}"</p>
                  
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full">
                      <Star className="w-3.5 h-3.5 text-yellow-300 fill-yellow-300" />
                      <span className="text-xs font-bold text-white">{lab.rating}</span>
                      <span className="text-[10px] text-white/80">({lab.reviews.toLocaleString()})</span>
                    </div>
                    <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full">
                      <Beaker className="w-3.5 h-3.5 text-white" />
                      <span className="text-xs font-medium text-white">{lab.tests.length}+ Tests</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Quick Info Pills */}
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm px-2.5 py-1 rounded-full">
                  <MapPin className="w-3 h-3 text-white/80" />
                  <span className="text-[10px] text-white/90 line-clamp-1">{lab.location}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm px-2.5 py-1 rounded-full">
                  <Clock className="w-3 h-3 text-white/80" />
                  <span className="text-[10px] text-white/90">{lab.timing}</span>
                </div>
                {lab.homeCollection && (
                  <div className="flex items-center gap-1.5 bg-green-500/30 backdrop-blur-sm px-2.5 py-1 rounded-full">
                    <Home className="w-3 h-3 text-green-200" />
                    <span className="text-[10px] text-green-100 font-medium">Home Collection</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>

        {/* CLOSED Banner */}
        {isClosed && (
          <div className="mx-4 mt-3 bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <p className="font-bold text-destructive text-sm">CLOSED</p>
              <p className="text-xs text-muted-foreground">This diagnostic center is currently not accepting bookings.</p>
            </div>
          </div>
        )}

        {/* Sticky search + tab filter (squeezes on scroll) */}
        <StickySearch
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search tests, packages..."
          footer={
            <div className="relative grid grid-cols-2 gap-1 p-1 rounded-2xl bg-muted/60 border border-border/50">
              {TABS.map((tab) => {
                const isActive = activeTab === tab.key;
                const count = tab.key === "packages" ? packageCount : allTestsCount;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className="relative z-10 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-colors"
                  >
                    {isActive && (
                      <motion.div
                        layoutId="lab-tab-pill"
                        className="absolute inset-0 bg-gradient-to-br from-primary to-primary/80 rounded-xl shadow-lg shadow-primary/30"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                    <span className={`relative ${isActive ? "text-primary-foreground" : "text-foreground/70"}`}>
                      {tab.label}
                    </span>
                    <span
                      className={`relative text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        isActive ? "bg-white/25 text-primary-foreground" : "bg-background text-muted-foreground"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          }
        />

        <div className="px-4 py-4 space-y-4">


          {/* Tests Count */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center justify-between"
          >
            <p className="text-sm text-muted-foreground">
              {filteredTests.length} {activeTab === "packages" ? "packages" : "tests"} available
            </p>
            {addedTests.size > 0 && (
              <Button
                size="sm"
                onClick={() => navigate("/cart")}
                className="gap-1"
              >
                <ShoppingCart className="w-4 h-4" />
                View Cart ({addedTests.size})
              </Button>
            )}
          </motion.div>

          {/* Tests List */}
          <div className="space-y-3 pb-8">
            {filteredTests.map((rawTest, index) => {
              const test = rawTest as DynamicTest;
              return (
              <motion.div
                key={test.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 + index * 0.03 }}
                className="soft-card p-4"
              >
                <div className="flex justify-between items-start gap-3">
                  <button
                    type="button"
                    onClick={() => setExpandedTest(expandedTest === test.id ? null : test.id)}
                    className="flex-1 min-w-0 text-left"
                    aria-expanded={expandedTest === test.id}
                  >
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-foreground text-sm">{test.name}</h3>
                      {test.popular && (
                        <Badge variant="secondary" className="text-[9px] bg-primary/10 text-primary">
                          Popular
                        </Badge>
                      )}
                      <ChevronRight className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${expandedTest === test.id ? "rotate-90" : ""}`} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {test.category}
                      {typeof test.testsCount === "number" && test.testsCount > 0 && (
                        <span> · {test.testsCount} tests included</span>
                      )}
                    </p>
                    {expandedTest === test.id && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="text-xs text-muted-foreground/90 mt-2 leading-relaxed"
                      >
                        {test.description ||
                          `${test.name} is a diagnostic test offered by ${lab.name}. Tap "Add" to include it in your cart. Sample collection, preparation guidance and report timing are confirmed at booking.`}
                      </motion.p>
                    )}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="font-semibold text-foreground">₹{test.price}</span>
                      {test.originalPrice && (
                        <span className="text-xs text-muted-foreground line-through">
                          ₹{test.originalPrice}
                        </span>
                      )}
                      {(test.discountPercent || test.originalPrice) && (
                        <Badge variant="secondary" className="text-[9px] bg-success/10 text-success">
                          {test.discountPercent
                            ? `${test.discountPercent}% OFF`
                            : `${Math.round(((test.originalPrice! - test.price) / test.originalPrice!) * 100)}% OFF`}
                        </Badge>
                      )}
                    </div>
                  </button>
                  <Button
                    size="sm"
                    variant={addedTests.has(test.id) ? "default" : "outline"}
                    className="flex-shrink-0 gap-1 h-8"
                    onClick={() => handleAddTest(test.id, test.name)}
                    disabled={isClosed}
                  >
                    {addedTests.has(test.id) ? (
                      <>
                        <Check className="w-3 h-3" />
                        Added
                      </>
                    ) : (
                      <>
                        <Plus className="w-3 h-3" />
                        Add
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>

              );
            })}

            {filteredTests.length === 0 && (
              <div className="text-center py-12">
                <Beaker className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  {activeTab === "packages"
                    ? "This lab hasn't published any health packages yet."
                    : "No tests found matching your search"}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating Cart Button */}
      {addedTests.size > 0 && (
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="fixed bottom-4 left-4 right-4 max-w-[398px] mx-auto"
        >
          <Button
            className="w-full gap-2 shadow-lg"
            size="lg"
            onClick={() => navigate("/cart")}
          >
            <ShoppingCart className="w-5 h-5" />
            View Cart ({addedTests.size} tests)
          </Button>
        </motion.div>
      )}

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

export default LabDetailScreen;