import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
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
  Activity,
  HeartPulse,
  Tag,
  IndianRupee,
  Truck,
  Percent,
  Gift,
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
import { createBurstDebouncer } from "@/lib/realtimeBurst";
import { useLabSlots } from "@/hooks/useLabSlots";
import { normalizeAvailabilityType } from "@/lib/test-availability";
import { TestFacts } from "@/components/tests/TestFacts";
import { commonTestsFirst } from "@/lib/test-order";
import { testNameParts, testSample } from "@/utils/simplify-test-name";

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
export const labsData: Record<string, {
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
    timing: "6:00 AM - 9:00 PM",
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
      { id: "lpl21", name: "Blood Pressure (BP) Check", price: 50, originalPrice: 100, category: "Heart Health" },
      { id: "lpl22", name: "Electrocardiogram (ECG)", price: 300, originalPrice: 450, category: "Heart Health" },
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
    timing: "6:30 AM - 9:00 PM",
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
    timing: "6:00 AM - 9:00 PM",
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

// Map database IDs & slug variations to local data keys
const dbIdToLocalId: Record<string, string> = {
  "1": "lal-pathlabs",
  "2": "thyrocare",
  "3": "metropolis",
  "4": "srl",
  "5": "apollo",
  "dr-lal-pathlabs": "lal-pathlabs",
  "lal-pathlabs": "lal-pathlabs",
  "thyrocare": "thyrocare",
  "metropolis-healthcare": "metropolis",
  "metropolis": "metropolis",
  "srl-diagnostics": "srl",
  "srl": "srl",
  "apollo-diagnostics": "apollo",
  "apollo": "apollo",
};

type TabKey = "general" | "specialized" | "packages";
const TABS: { key: TabKey; label: string }[] = [
  { key: "general", label: "Every Day" },
  { key: "specialized", label: "Selected Days" },
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
  offers_home_bp?: boolean | null;
  offers_home_ecg?: boolean | null;
  ecg_available?: boolean | null;
  home_bp_price?: number | null;
  ecg_price?: number | null;
  available_tests: string[] | null;
  pricing: Record<string, number> | null;
  is_active: boolean | null;
  closed_days?: string[] | null;
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
  availabilityType?: "GENERAL" | "SPECIALIZED";
  availableDays?: string[];
  sampleType?: string;
  preparationRequired?: boolean;
  preparationInstruction?: string;
  fastingRequired?: boolean;
  fastingInstruction?: string;
  reportType?: string;
  reportTime?: string;
  prescriptionRequired?: boolean;
}

// ─── Active Offers Component ───
const ActiveOffers = ({ centerId }: { centerId?: string }) => {
  const [offers, setOffers] = useState<any[]>([]);

  useEffect(() => {
    if (!centerId) return;
    
    const loadOffers = async () => {
      const { data, error } = await supabase
        .from('lab_offers')
        .select('*')
        .eq('lab_id', centerId)
        .eq('is_active', true)
        .gte('end_date', new Date().toISOString().split('T')[0])
        .order('created_at', { ascending: false });
        
      if (!error && data) {
        setOffers(data);
      }
    };
    
    loadOffers();
  }, [centerId]);

  if (offers.length === 0) return null;

  const generateDescription = (offer: any) => {
    const min = `₹${offer.min_order_amount.toLocaleString("en-IN")}`;
    switch (offer.type) {
      case "free_delivery":
        return `Free delivery on orders above ${min}`;
      case "percentage_discount":
        return `${offer.discount_value}% off on orders above ${min}${offer.max_discount_cap ? ` (up to ₹${offer.max_discount_cap.toLocaleString("en-IN")})` : ""}`;
      case "flat_discount":
        return `₹${offer.discount_value.toLocaleString("en-IN")} off on orders above ${min}`;
    }
    return "";
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="px-5 mb-6">
      <h2 className="text-[17px] font-black text-foreground tracking-tight mb-3">Offers for you</h2>
      <div className="flex overflow-x-auto gap-3 pb-2 -mx-5 px-5 scrollbar-none" style={{ WebkitOverflowScrolling: 'touch' }}>
        {offers.map((offer) => {
          const isFreeDelivery = offer.type === "free_delivery";
          const Icon = isFreeDelivery ? Truck : (offer.type === "percentage_discount" ? Percent : IndianRupee);
          const colorClass = isFreeDelivery ? "bg-emerald-50 border-emerald-200" : "bg-violet-50 border-violet-200";
          const iconColorClass = isFreeDelivery ? "text-emerald-600 bg-emerald-100" : "text-violet-600 bg-violet-100";
          const badgeColorClass = isFreeDelivery ? "bg-emerald-100 text-emerald-700" : "bg-violet-100 text-violet-700";

          return (
            <div key={offer.id} className={`flex-shrink-0 w-[280px] border rounded-2xl p-4 flex flex-col gap-3 ${colorClass}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                   <div className={`w-8 h-8 rounded-full flex items-center justify-center ${iconColorClass}`}>
                      <Icon className="w-4 h-4" />
                   </div>
                   <Badge variant="outline" className={`border-transparent font-bold ${badgeColorClass}`}>
                     {isFreeDelivery ? "Free Delivery" : "Discount"}
                   </Badge>
                </div>
              </div>
              <div>
                <p className="text-[14px] font-bold text-foreground leading-snug">{generateDescription(offer)}</p>
                <p className="text-[11px] font-medium text-muted-foreground mt-1">Valid till {formatDate(offer.end_date)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Simple session cache to prevent showing the skeleton loader on subsequent visits
const globalLabCache = new Map<string, { labFromDb: any; dynamicTests: DynamicTest[]; packages: DynamicTest[] }>();

const LabDetailScreen = () => {
  const { labId } = useParams<{ labId: string }>();
  const navigate = useNavigate();
  const { addToCart, pendingItem, confirmReplace, cancelReplace, items, hasItem } = useCart();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("general");
  const [expandedTest, setExpandedTest] = useState<string | null>(null);
  const [serviceError, setServiceError] = useState<{title: string, message: string} | null>(null);
  
  const cached = labId ? globalLabCache.get(labId) : null;
  const [labFromDb, setLabFromDb] = useState<DiagnosticCenter | null>(cached?.labFromDb || null);
  // Live schedule from the Partner dashboard — same source as the booking slots.
  const { data: partnerSlots } = useLabSlots(labFromDb?.vendor_id ?? null);
  const [dynamicTests, setDynamicTests] = useState<DynamicTest[]>(cached?.dynamicTests || []);
  const [isLoading, setIsLoading] = useState(!cached);
  const [catalogueRefresh, setCatalogueRefresh] = useState(0);

  // Try to fetch lab from database first
  useEffect(() => {
    const fetchLabFromDb = async () => {
      if (!labId) {
        setIsLoading(false);
        return;
      }
      const cachedLab = globalLabCache.get(labId);
      if (cachedLab) {
        setLabFromDb(cachedLab.labFromDb);
        setDynamicTests(cachedLab.dynamicTests);
        setPackages(cachedLab.packages);
        setIsLoading(false);
      } else {
        // Reset state for new lab to prevent leaking previous lab's data
        setIsLoading(true);
        setLabFromDb(null);
        setDynamicTests([]);
        setPackages([]);
      }

      try {
        const { data, error } = await supabase
          .from('diagnostic_centers')
          .select('id, name, address, city, rating, reviews_count, opening_time, closing_time, home_collection_available, logo_url, phone, vendor_id, available_tests, pricing, is_active, offers_home_bp, offers_home_ecg, ecg_available, home_bp_price, ecg_price')
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
                description: p.description || undefined,
                availabilityType: normalizeAvailabilityType(p.availability_type),
                availableDays: p.available_days || undefined,
                sampleType: p.sample_type || undefined,
                preparationRequired: p.preparation_required || false,
                preparationInstruction: p.preparation_instruction || undefined,
                fastingRequired: p.fasting_required || false,
                fastingInstruction: p.fasting_instruction || undefined,
                reportType: p.report_type || undefined,
                reportTime: (p as { report_time?: string | null }).report_time || undefined,
                prescriptionRequired: p.prescription_required === true,
              }));
            }
          }

          setDynamicTests(allDynamicTests);
          if (labId) {
            globalLabCache.set(labId, {
              labFromDb: data,
              dynamicTests: allDynamicTests,
              packages: [] // Will be populated by the packages effect
            });
          }
        }
      } catch (err) {
        console.error('Error fetching lab:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLabFromDb();
  }, [labId, catalogueRefresh]);

  // Partner catalogue changes must replace the in-memory lab cache immediately.
  // This keeps General/Specialized tabs accurate without requiring an app reload.
  useEffect(() => {
    const vendorId = labFromDb?.vendor_id;
    if (!labId || !vendorId) return;

    // A partner catalogue sync updates many product rows at once: reload once per burst.
    const reload = createBurstDebouncer(() => {
      globalLabCache.delete(labId);
      setCatalogueRefresh((value) => value + 1);
    });
    const channel = supabase
      .channel(`lab-products-${vendorId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products", filter: `vendor_id=eq.${vendorId}` },
        () => reload.trigger(),
      )
      .subscribe();

    return () => {
      reload.cancel();
      supabase.removeChannel(channel);
    };
  }, [labFromDb?.vendor_id, labId]);

  // Separate health-packages fetch + realtime subscription tied to the diagnostic center
  const [packages, setPackages] = useState<DynamicTest[]>(cached?.packages || []);
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
      
      if (labId) {
        const existing = globalLabCache.get(labId);
        if (existing) {
          existing.packages = (data || []).map((pkg: any) => ({
            id: pkg.id,
            name: pkg.name,
            price: Number(pkg.price),
            originalPrice: pkg.original_price ? Number(pkg.original_price) : undefined,
            category: 'Health Packages',
            popular: pkg.is_popular || false,
            description: pkg.description || undefined,
            testsCount: pkg.tests_count || undefined,
            discountPercent: pkg.discount_percent || undefined,
          }));
        }
      }
    };

    loadPackages();

    const reloadPackages = createBurstDebouncer(() => loadPackages());
    const channel = supabase
      .channel(`test_packages-${centerId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'test_packages', filter: `diagnostic_center_id=eq.${centerId}` },
        () => reloadPackages.trigger()
      )
      .subscribe();

    return () => {
      reloadPackages.cancel();
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
      const localKey = Object.entries(dbIdToLocalId).find(([dbKey]) => 
        labFromDb.name.toLowerCase().includes(dbKey.split('-')[0])
      )?.[1];
      
      const localData = localKey ? labsData[localKey] : null;
      const baseTests = dynamicTests;
      const nonPackageBase = baseTests.filter((t) => t.category !== "Health Packages");
      const fetchedTests = [...nonPackageBase, ...packages];
      const testsToUse = fetchedTests; // strictly rely on DB data
      
      return {
        name: labFromDb.name,
        rating: labFromDb.rating || 4.5,
        reviews: labFromDb.reviews_count || 1000,
        location: labFromDb.address ? `${labFromDb.address}, ${labFromDb.city || ''}` : "Pan India",
        timing: `${labFromDb.opening_time || '7:00 AM'} - ${labFromDb.closing_time || '9:00 PM'}`,
        homeCollection: labFromDb.home_collection_available ?? true,
        accredited: ["NABL"],
        tests: testsToUse,
        phone: labFromDb.phone,
        logoUrl: labFromDb.logo_url,
        vendorId: labFromDb.vendor_id,
        isActive: labFromDb.is_active !== false,
        closedDays: labFromDb.closed_days || ["Sun"],
      };
    }
    
    // Fallback to hardcoded data
    const localId = labId ? (dbIdToLocalId[labId] || labId) : "lal-pathlabs";
    const fallback = labsData[localId] || labsData["lal-pathlabs"] || Object.values(labsData)[0];
    return { ...fallback, tests: [] }; // Prevent hardcoded tests
  };



  const rawLab = getLabData();
  const lab = rawLab || { ...labsData["lal-pathlabs"], tests: [] };
  const isClosed = !!(lab && 'isActive' in lab && !(lab as any).isActive);

  const labTests = lab.tests || [];
  const minTestPrice = labTests.length > 0 ? Math.min(...labTests.map(t => t.price).filter(p => p > 0)) : 0;
  const packageCount = labTests.filter((t) => t.category === "Health Packages").length;
  const generalTestsCount = labTests.filter((t) => t.category !== "Health Packages" && normalizeAvailabilityType(t.availabilityType) === "GENERAL").length;
  const specializedTestsCount = labTests.filter((t) => t.category !== "Health Packages" && normalizeAvailabilityType(t.availabilityType) === "SPECIALIZED").length;
  const matchingTests = labTests.filter((test) => {
    if (!test || !test.name) return false;
    const matchesSearch = test.name.toLowerCase().includes((searchQuery || "").toLowerCase());
    const isPackage = test.category === "Health Packages";
    const availabilityType = normalizeAvailabilityType(test.availabilityType);
    const matchesTab = activeTab === "packages"
      ? isPackage
      : !isPackage && availabilityType === (activeTab === "specialized" ? "SPECIALIZED" : "GENERAL");
    const matchesCategory = selectedCategory ? test.category === selectedCategory : true;
    return matchesSearch && matchesTab && matchesCategory;
  });
  const filteredTests = activeTab === "packages" ? matchingTests : commonTestsFirst(matchingTests);

  const availableCategories = useMemo(() => {
    const isPackage = activeTab === "packages";
    const baseTests = labTests.filter(t => {
      if (!t || !t.name) return false;
      const tIsPackage = t.category === "Health Packages";
      if (tIsPackage !== isPackage) return false;
      if (isPackage) return true;
      return normalizeAvailabilityType(t.availabilityType) === (activeTab === "specialized" ? "SPECIALIZED" : "GENERAL");
    });
    return Array.from(new Set(baseTests.map(t => t.category).filter(Boolean)));
  }, [labTests, activeTab]);

  const handleAddTest = (testId: string, testName: string) => {
    const test = lab.tests.find((t) => t.id === testId);
    if (test) {
      const ok = addToCart({
        id: testId,
        name: testName,
        price: test.price,
        labId: labId || "",
        labName: lab.name,
        vendorId: (lab as { vendorId?: string | null }).vendorId || undefined,
        kind: test.category === "Health Packages" ? "package" : "test",
        availabilityType: test.availabilityType,
        availableDays: test.availableDays,
        sampleType: test.sampleType,
        preparationRequired: test.preparationRequired,
        preparationInstruction: test.preparationInstruction,
        fastingRequired: test.fastingRequired,
        fastingInstruction: test.fastingInstruction,
        reportType: test.reportType,
      });
      if (ok) {
        toast.success(`${testName} added to cart`);
      }
    }
  };

  const handleConfirmReplace = () => {
    confirmReplace();
    toast.success("Cart replaced with new lab items");
  };

  // Get visual theme for lab
  const labName = lab?.name || "Diagnostic Center";
  const brandData = labBrandData[labName];
  const charCode = labName.length > 0 ? labName.charCodeAt(0) : 76;
  const fallbackTheme = fallbackThemes[Math.abs(charCode % fallbackThemes.length)];
  const bannerGradient = brandData?.bannerGradient || fallbackTheme.gradient;
  const tagline = brandData?.tagline || fallbackTheme.tagline;
  const logoUrl = brandData?.logo || (labFromDb?.logo_url) || null;
  const accreditedText = Array.isArray(lab.accredited) ? lab.accredited.join(" & ") : "NABL";
  const reviewsCountText = typeof lab.reviews === "number" ? lab.reviews.toLocaleString() : "1,000";

  if (isLoading) {
    return (
      <MobileLayout showNav={false}>
        <div className="pb-32 bg-slate-50 min-h-screen">
          <div className="relative h-72 w-full rounded-b-[2.5rem] bg-slate-200 animate-pulse overflow-hidden shadow-sm">
            <div className="absolute -top-3 left-4 z-10 pt-safe">
              <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                <ChevronRight className="w-5 h-5 rotate-180 text-slate-400" />
              </button>
            </div>
          </div>
          <div className="px-5 -mt-20 relative z-20">
            <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100/50 mb-6 flex flex-col items-center animate-pulse">
              <div className="w-20 h-20 bg-slate-200 rounded-2xl mb-4" />
              <div className="h-6 bg-slate-200 rounded-md w-3/4 mb-2" />
              <div className="h-4 bg-slate-200 rounded-md w-1/2" />
            </div>
          </div>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout showNav={false}>
      <div className="pb-32 bg-slate-50 min-h-screen">
        {/* Header with image */}
        <div className="relative h-72 w-full rounded-b-[2.5rem] overflow-hidden shadow-sm">
          <img loading="lazy" decoding="async" src="/lab-banner.png" alt="Lab" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          
          <div className="absolute -top-3 left-4 right-4 flex items-center justify-between z-10 pt-safe">
            <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-white flex items-center justify-center transition-transform active:scale-90 text-secondary shadow-sm flex-shrink-0">
              <ChevronRight className="w-5 h-5 rotate-180" />
            </button>
            
            <div className="flex-1 mx-3">
              <div className="relative flex items-center w-full h-10 rounded-full bg-white border border-transparent shadow-sm overflow-hidden">
                <Search className="w-4 h-4 text-muted-foreground ml-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (selectedCategory) setSelectedCategory(null);
                  }}
                  placeholder="Search tests..."
                  className="flex-1 bg-transparent border-none text-foreground text-sm px-2 py-2 placeholder:text-muted-foreground focus:outline-none focus:ring-0"
                />
              </div>
            </div>

            <button onClick={() => navigate("/cart")} className="w-10 h-10 rounded-full bg-white flex items-center justify-center transition-transform active:scale-90 text-secondary shadow-sm relative flex-shrink-0">
              <ShoppingCart className="w-5 h-5" />
              {items.length > 0 && (
                <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border border-white" />
              )}
            </button>
          </div>

          <div className="absolute bottom-8 left-6 right-6 flex items-center gap-3">
             <motion.div className="flex items-center justify-center shrink-0">
               {logoUrl ? (
                 <img loading="lazy" decoding="async" width={32} height={32} src={logoUrl} alt="Logo" className="w-8 h-8 rounded-xl bg-white p-1 object-contain shadow-sm" />
               ) : (
                 <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shadow-sm">
                   <Building2 className="w-5 h-5 text-primary" />
                 </div>
               )}
             </motion.div>
            <motion.h1 className="text-[22px] font-black text-white leading-tight drop-shadow-lg">{labName}</motion.h1>
          </div>
        </div>

        {/* Services Cards */}
        <div className="px-5 -mt-6 relative z-20">
          <div className="grid grid-cols-3 gap-3">
             <button onClick={() => { 
               setActiveTab("general"); 
               setSelectedCategory("Blood Tests");
               setSearchQuery("");
               setTimeout(() => {
                 const el = document.getElementById("tests-section");
                 if (el) {
                   const y = el.getBoundingClientRect().top + window.scrollY - 100;
                   window.scrollTo({ top: y, behavior: 'smooth' });
                 }
               }, 100);
             }} className="bg-white rounded-2xl p-3 shadow-xl shadow-black/5 flex flex-col items-center justify-center border border-border/50 text-center transition-transform active:scale-95">
               <div className="w-10 h-10 rounded-xl bg-[#fee2e2] flex items-center justify-center mb-2">
                 <Beaker className="w-5 h-5 text-[#ef4444]" />
               </div>
               <p className="text-[13px] font-black text-foreground">Blood Tests</p>
               {minTestPrice > 0 ? (
                 <div className="flex items-center gap-1 mt-0.5 justify-center">
                   <Tag className="w-3 h-3 text-amber-500 fill-amber-500" />
                   <p className="text-[11px] font-bold text-foreground">₹{minTestPrice} onwards</p>
                 </div>
               ) : (
                 <p className="text-[10px] font-bold text-muted-foreground mt-0.5">Explore</p>
               )}
             </button>
             
             <button onClick={() => {
               if (labFromDb && !labFromDb.offers_home_bp) {
                 setServiceError({
                   title: "Service Unavailable",
                   message: `${labName} currently does not provide BP Check services. Please choose another lab for this service.`
                 });
                 return;
               }
               navigate("/bp-check", {
                 state: {
                    preselectedLab: {
                      id: labFromDb?.id || "lal-pathlabs",
                      name: labName,
                      logo_url: logoUrl,
                      vendor_id: labFromDb?.vendor_id ?? null,
                      home_bp_price: labFromDb?.home_bp_price || 199,
                    }

                 }
               });
             }} className="bg-white rounded-2xl p-3 shadow-xl shadow-black/5 flex flex-col items-center justify-center border border-border/50 text-center transition-transform active:scale-95">
               <div className="flex flex-col items-center justify-center">
                 <div className="w-10 h-10 rounded-xl bg-[#e0f2fe] flex items-center justify-center mb-2">
                   <Activity className="w-5 h-5 text-[#0284c7]" />
                 </div>
                 <p className="text-[13px] font-black text-foreground">BP Check</p>
               </div>
               {labFromDb && !labFromDb.offers_home_bp ? (
                 <p className="text-[10px] font-bold text-rose-500 mt-0.5">Not Available</p>
               ) : (
                 <div className="flex items-center gap-1 mt-0.5 justify-center">
                   <Tag className="w-3 h-3 text-amber-500 fill-amber-500" />
                   <p className="text-[11px] font-bold text-foreground">₹{labFromDb?.home_bp_price || 199}</p>
                 </div>
               )}
             </button>
             
             <button onClick={() => {
               const ecgAvailable = labFromDb ? (labFromDb.offers_home_ecg || labFromDb.ecg_available) : true;
               if (labFromDb && !ecgAvailable) {
                 setServiceError({
                   title: "Service Unavailable",
                   message: `${labName} currently does not provide ECG services. Please choose another lab for this service.`
                 });
                 return;
               }
               navigate("/ecg-test", {
                 state: {
                    preselectedLab: {
                      id: labFromDb?.id || "lal-pathlabs",
                      name: labName,
                      logo_url: logoUrl,
                      vendor_id: labFromDb?.vendor_id ?? null,
                      home_ecg_price: labFromDb?.ecg_price || 599,
                      ecg_available: true,
                    }

                 }
               });
             }} className="bg-white rounded-2xl p-3 shadow-xl shadow-black/5 flex flex-col items-center justify-center border border-border/50 text-center transition-transform active:scale-95">
               <div className="flex flex-col items-center justify-center">
                 <div className="w-10 h-10 rounded-xl bg-[#dcfce7] flex items-center justify-center mb-2">
                   <HeartPulse className="w-5 h-5 text-[#16a34a]" />
                 </div>
                 <p className="text-[13px] font-black text-foreground">ECG</p>
               </div>
               {labFromDb && !(labFromDb.offers_home_ecg || labFromDb.ecg_available) ? (
                 <p className="text-[10px] font-bold text-rose-500 mt-0.5">Not Available</p>
               ) : (
                 <div className="flex items-center gap-1 mt-0.5 justify-center">
                   <Tag className="w-3 h-3 text-amber-500 fill-amber-500" />
                   <p className="text-[11px] font-bold text-foreground">₹{labFromDb?.ecg_price || 599}</p>
                 </div>
               )}
             </button>
          </div>
        </div>

        {/* CLOSED Banner */}
        {isClosed && (
          <div className="mx-5 mt-4 bg-destructive/10 border border-destructive/30 rounded-2xl px-4 py-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <p className="font-bold text-destructive text-sm">CLOSED</p>
              <p className="text-xs text-muted-foreground">This diagnostic center is currently not accepting bookings.</p>
            </div>
          </div>
        )}



        {/* Active Offers Section */}
        <ActiveOffers centerId={labFromDb?.vendor_id ?? undefined} />

        {/* Schedule Section */}
        <div className="px-5 mb-4">
          <h2 className="text-[17px] font-black text-foreground tracking-tight mb-3">Schedules</h2>
          <div className="flex items-center justify-between gap-1 overflow-x-auto pb-2 scrollbar-none">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, dayIndex) => {
              const partnerDay = partnerSlots?.byDay?.[dayIndex];
              const isClosedDay = partnerSlots?.hasSchedule
                ? !partnerDay?.is_open || (partnerDay?.slots?.length ?? 0) === 0
                : ((lab as any).closedDays || ["Sun"]).includes(day);
              return (
                <div key={day} className={`flex flex-col items-center justify-center py-2.5 px-3 rounded-2xl flex-1 border ${isClosedDay ? 'bg-muted/30 border-border/40 opacity-70' : 'bg-white border-border shadow-sm'}`}>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{day}</span>
                  <span className={`text-[11px] font-black mt-1 ${isClosedDay ? 'text-destructive' : 'text-foreground'}`}>
                    {isClosedDay ? 'OFF' : 'Open'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div id="tests-section" className="px-5 mt-2 flex items-center justify-between">
            <h2 className="text-[17px] font-black text-foreground tracking-tight">Tests & Packages</h2>
        </div>

        {/* Tab filters - Scrolls away and hides behind sticky search bar */}
        <div className="px-5 pt-3 pb-1">
          <div className="relative grid grid-cols-3 gap-1.5 p-1.5 rounded-2xl bg-white border border-border/60 shadow-sm">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              const count = tab.key === "packages" ? packageCount : tab.key === "specialized" ? specializedTestsCount : generalTestsCount;
              return (
                <button
                  key={tab.key}
                  onClick={() => {
                    setActiveTab(tab.key);
                    setSelectedCategory(null);
                  }}
                   className="relative z-10 flex min-w-0 flex-col items-center justify-center gap-0.5 px-1 py-2 rounded-xl text-[11px] font-extrabold transition-all"
                >
                  {isActive && (
                    <motion.div
                      layoutId="lab-tab-pill"
                      className="absolute inset-0 bg-[#0f172a] rounded-xl shadow-xs"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className={`relative tracking-tight ${isActive ? "text-white" : "text-muted-foreground"}`}>
                    {tab.label}
                  </span>
                  <span
                    className={`relative text-[10px] font-black px-2 py-0.5 rounded-full ${
                      isActive ? "bg-white/20 text-white" : "bg-muted text-foreground"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="px-5 py-2 space-y-4">
          {/* Tests Count and Filter */}
          <motion.div
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0}}
            className="flex items-center justify-between"
          >
            <p className="text-xs font-extrabold text-muted-foreground tracking-tight">
              {filteredTests.length} {activeTab === "packages" ? "packages" : "tests"} available
            </p>
            {availableCategories.length > 1 && (
              <select
                className="text-xs font-bold text-foreground bg-white border-2 border-border/80 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/20 max-w-[150px] truncate shadow-sm cursor-pointer"
                value={selectedCategory || ""}
                onChange={(e) => setSelectedCategory(e.target.value || null)}
              >
                <option value="">All Categories</option>
                {availableCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            )}
          </motion.div>

          {/* Tests List */}
          <div className="space-y-3 pb-24">
            {filteredTests.map((rawTest, index) => {
              const test = rawTest as DynamicTest;
              const isAdded = hasItem(test.id, test.name);
              const { title } = testNameParts(test.name);
              return (
                <motion.div
                  key={test.id}
                  initial={false}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0}}
                  className="bg-card rounded-3xl border border-border/60 p-4 shadow-2xs hover:shadow-xs transition-all"
                >
                  <div className="flex justify-between items-start gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        navigate(`/test/${test.id}`, {
                          state: {
                            bridgeTest: test,
                            preselectedLab: {
                              id: labId || "lal-pathlabs",
                              name: lab.name,
                              vendor_id: (lab as any).vendorId || labFromDb?.vendor_id,
                              productPrice: test.price
                            }
                          }
                        });
                      }}
                      className="flex-1 min-w-0 text-left"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-extrabold text-foreground text-sm tracking-tight">{title}</h3>
                        {test.popular && (
                          <Badge variant="soft" className="text-[9px] bg-amber-500/10 text-amber-600 font-bold px-2 py-0.5">
                            Popular
                          </Badge>
                        )}
                      </div>
                      <TestFacts test={{ ...test, sampleType: testSample(test.name, test.sampleType) }} className="mt-1.5" />
                      {typeof test.testsCount === "number" && test.testsCount > 0 && (
                        <p className="text-xs font-semibold text-muted-foreground mt-0.5">
                          <span>{test.testsCount} tests included</span>
                        </p>
                      )}
                      {expandedTest === test.id && (
                        <motion.p
                          initial={false}
                          animate={{ opacity: 1, height: "auto" }}
                          className="text-xs text-muted-foreground mt-2 leading-relaxed font-medium"
                        >
                          {test.description ||
                            `${title} is a diagnostic test offered by ${lab.name}. Tap "Add" to include it in your cart.`}
                        </motion.p>
                      )}
                      <div className="flex items-baseline gap-2 mt-3.5 flex-wrap">
                        <span className="text-base font-black text-foreground tabular-nums">₹{test.price}</span>
                        {test.originalPrice && (
                          <span className="text-xs font-semibold text-muted-foreground line-through tabular-nums">
                            ₹{test.originalPrice}
                          </span>
                        )}
                        {(test.discountPercent || test.originalPrice) && (
                          <Badge variant="soft" className="text-[10px] bg-emerald-500/10 text-emerald-600 font-bold px-2 py-0.5">
                            {test.discountPercent
                              ? `${test.discountPercent}% OFF`
                              : `${Math.round(((test.originalPrice! - test.price) / test.originalPrice!) * 100)}% OFF`}
                          </Badge>
                        )}
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isAdded) {
                          navigate("/cart");
                        } else {
                          handleAddTest(test.id, test.name);
                        }
                      }}
                      disabled={isClosed}
                      className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 duration-100 ease-out press ${
                        isAdded
                          ? "bg-success text-white shadow-md"
                          : "bg-[#38bdf8] text-white shadow-md"
                      }`}
                      aria-label={isAdded ? "View item in cart" : "Add test to cart"}
                    >
                      {isAdded ? <Check className="w-5 h-5 stroke-[2.5]" /> : <Plus className="w-5 h-5" />}
                    </button>
                  </div>
                </motion.div>
              );
            })}

            {filteredTests.length === 0 && (
              <div className="text-center py-12 px-6">
                <div className="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center mx-auto mb-4">
                  <Beaker className="w-8 h-8 text-warning" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-1">
                  {searchQuery
                    ? "No matching tests"
                    : activeTab === "packages"
                      ? "No health packages yet"
                      : "No tests activated yet"}
                </h3>
                <p className="text-sm text-muted-foreground max-w-[280px] mx-auto">
                  {searchQuery
                    ? "Try a different search term."
                    : activeTab === "packages"
                      ? "This lab hasn't published any health packages yet."
                      : "This lab hasn't activated any tests from their partner dashboard yet. Please check back soon."}
                </p>
              </div>
            )}
          </div>
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

      {/* Service Error Popup */}
      {createPortal(
        <AnimatePresence>
          {serviceError && (
            <motion.div
              initial={false}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 px-5"
            >
              <motion.div
                initial={false}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className="bg-white rounded-[2rem] p-6 w-full max-w-sm shadow-2xl overflow-hidden"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
                    <AlertCircle className="w-8 h-8 text-destructive" />
                  </div>
                  <h3 className="text-xl font-black text-foreground tracking-tight mb-2">
                    {serviceError.title}
                  </h3>
                  <p className="text-sm font-medium text-muted-foreground leading-relaxed mb-6">
                    {serviceError.message}
                  </p>
                  <button
                    onClick={() => setServiceError(null)}
                    className="w-full bg-[#0f172a] text-white font-bold py-3.5 rounded-xl active:scale-95 transition-transform"
                  >
                    Got it
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

    </MobileLayout>
  );
};

export default LabDetailScreen;