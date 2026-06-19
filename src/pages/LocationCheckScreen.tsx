import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Navigation, Loader2, AlertCircle, Bell, Sparkles, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';

interface ServiceableArea {
  pincode: string;
  city: string | null;
  state: string | null;
}

/**
 * Curated landmark cities — shown as quick-pick tiles on the location screen.
 * The pincode is a representative serviceable PIN for that city; tapping a
 * tile auto-runs the same serviceability check + saves the address.
 */
const LANDMARK_CITIES: {
  name: string;
  state: string;
  pincode: string;
  gradient: string;
  Icon: (props: { className?: string }) => JSX.Element;
}[] = [

  {
    name: "Delhi",
    state: "Delhi",
    pincode: "110001",
    gradient: "from-amber-500/30 to-rose-500/20",
    Icon: ({ className }) => (
      <svg className={className} viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 52V28a16 16 0 0132 0v24" />
        <path d="M22 52V32M42 52V32M32 22v-6" />
        <path d="M12 52h40" />
        <circle cx="32" cy="14" r="2" fill="currentColor" />
      </svg>
    ),
  },
  {
    name: "Kolkata",
    state: "West Bengal",
    pincode: "700001",
    gradient: "from-orange-500/30 to-yellow-500/20",
    Icon: ({ className }) => (
      <svg className={className} viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 46h52" />
        <path d="M10 46V30M54 46V30" />
        <path d="M10 30L32 14l22 16" />
        <path d="M18 46v-8M26 46v-12M38 46v-12M46 46v-8" />
        <path d="M14 38h36" />
      </svg>
    ),
  },
  {
    name: "Mumbai",
    state: "Maharashtra",
    pincode: "400001",
    gradient: "from-cyan-500/30 to-blue-500/20",
    Icon: ({ className }) => (
      <svg className={className} viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 52V24a20 20 0 0140 0v28" />
        <path d="M20 52V28a12 12 0 0124 0v24" />
        <path d="M28 52V40a4 4 0 018 0v12" />
        <path d="M10 52h44" />
        <circle cx="32" cy="14" r="2" />
      </svg>
    ),
  },
  {
    name: "Bangalore",
    state: "Karnataka",
    pincode: "560001",
    gradient: "from-emerald-500/30 to-green-500/20",
    Icon: ({ className }) => (
      <svg className={className} viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 52V32h48v20" />
        <path d="M14 32V22l18-8 18 8v10" />
        <path d="M28 52V40h8v12" />
        <path d="M18 38v8M24 38v8M40 38v8M46 38v8" />
        <path d="M6 52h52" />
      </svg>
    ),
  },
  {
    name: "Hyderabad",
    state: "Telangana",
    pincode: "500001",
    gradient: "from-fuchsia-500/30 to-purple-500/20",
    Icon: ({ className }) => (
      <svg className={className} viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="14" y="22" width="36" height="30" rx="1" />
        <path d="M10 52h44" />
        <path d="M14 22h36M18 22v-6M28 22v-6M36 22v-6M46 22v-6" />
        <path d="M18 16c0-3 2-5 4-5M46 16c0-3-2-5-4-5" />
        <path d="M32 30v18M22 38h20" />
      </svg>
    ),
  },
  {
    name: "Chennai",
    state: "Tamil Nadu",
    pincode: "600001",
    gradient: "from-sky-500/30 to-indigo-500/20",
    Icon: ({ className }) => (
      <svg className={className} viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M26 52V24h12v28" />
        <path d="M22 24h20" />
        <rect x="28" y="16" width="8" height="8" rx="1" />
        <path d="M32 16v-6" />
        <path d="M8 52h48" />
        <path d="M14 46c4-2 8-2 12 0M38 46c4-2 8-2 12 0" />
      </svg>
    ),
  },
  {
    name: "Pune",
    state: "Maharashtra",
    pincode: "411001",
    gradient: "from-rose-500/30 to-pink-500/20",
    Icon: ({ className }) => (
      <svg className={className} viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 52V28h44v24" />
        <path d="M22 52V36h6v16M36 52V36h6v16" />
        <path d="M10 28l22-14 22 14" />
        <path d="M6 52h52" />
      </svg>
    ),
  },
  {
    name: "Jaipur",
    state: "Rajasthan",
    pincode: "302001",
    gradient: "from-orange-500/30 to-red-500/20",
    Icon: ({ className }) => (
      <svg className={className} viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 52V20l22-12 22 12v32" />
        <path d="M18 52V30M26 52V30M38 52V30M46 52V30" />
        <path d="M14 30h36" />
        <path d="M6 52h52" />
      </svg>
    ),
  },
];

const LocationCheckScreen = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState<"detecting" | "manual" | "serviceable" | "not-serviceable">("detecting");
  const [pincode, setPincode] = useState("");
  const [detectedPincode, setDetectedPincode] = useState("");
  const [locationName, setLocationName] = useState("");
  const [loading, setLoading] = useState(false);
  const [serviceableSet, setServiceableSet] = useState<Set<string>>(new Set());

  // Single-flight guards — prevent React StrictMode / double-tap from saving the address twice
  const savingRef = useRef(false);
  const savedKeyRef = useRef<string | null>(null);

  const reverseGeocode = async (lat: number, lon: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`,
        { headers: { "User-Agent": "BloodLyn-App" } }
      );
      const data = await res.json();
      const addr = data.address || {};
      const pc = addr.postcode || "";
      const city = addr.city || addr.town || addr.village || addr.county || "";
      const state = addr.state || "";
      return { pincode: pc, display: `${city}${state ? ", " + state : ""}` };
    } catch {
      return { pincode: "", display: "" };
    }
  };

  // Load the full serviceable pincode set once on mount (used for both
  // PIN entry validation and to highlight which curated cities are live).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("diagnostic_centers")
        .select("pincode, service_pincodes, is_active")
        .eq("is_active", true);
      if (cancelled || !data) return;
      const set = new Set<string>();
      (data as any[]).forEach((lab) => {
        if (Array.isArray(lab.service_pincodes)) {
          lab.service_pincodes.forEach((p: any) => {
            const v = String(p).trim();
            if (/^\d{6}$/.test(v)) set.add(v);
          });
        }
        const raw = (lab.pincode || "").trim();
        if (raw) raw.split(/[,;\s]+/).forEach((p: string) => {
          const v = p.trim();
          if (/^\d{6}$/.test(v)) set.add(v);
        });
      });
      setServiceableSet(set);
    })();
    return () => { cancelled = true; };
  }, []);

  const checkServiceability = (pc: string): boolean => serviceableSet.has(pc.trim());

  /**
   * Save address (idempotent). Guarantees:
   *  - Never runs concurrently for the same user (`savingRef`).
   *  - Never inserts twice for the same pincode (`savedKeyRef` + DB lookup).
   *  - When the address already exists, simply flips it to default.
   */
  const saveAddressAndProceed = async (pc: string, displayName: string, lat?: number, lon?: number) => {
    if (!user) return;
    const key = `${user.id}:${pc.trim()}`;
    if (savingRef.current || savedKeyRef.current === key) {
      navigate("/home", { replace: true });
      return;
    }
    savingRef.current = true;
    try {
      const { data: existing } = await supabase
        .from("addresses")
        .select("id, is_default")
        .eq("user_id", user.id)
        .eq("pincode", pc.trim())
        .limit(1);

      if (existing && existing.length > 0) {
        if (!existing[0].is_default) {
          await supabase.from("addresses").update({ is_default: false }).eq("user_id", user.id);
          await supabase.from("addresses").update({ is_default: true }).eq("id", existing[0].id);
        }
      } else {
        await supabase.from("addresses").update({ is_default: false }).eq("user_id", user.id);
        await supabase.from("addresses").insert({
          user_id: user.id,
          address_line1: displayName || `Location - ${pc}`,
          city: displayName.split(",")[0]?.trim() || "",
          state: displayName.split(",")[1]?.trim() || "",
          pincode: pc.trim(),
          latitude: lat || null,
          longitude: lon || null,
          is_default: true,
          type: "Home",
        });
      }
      savedKeyRef.current = key;
      localStorage.setItem(`location_checked_${user.id}`, "true");
      navigate("/home", { replace: true });
    } catch (e) {
      console.error("Failed to save address:", e);
      savingRef.current = false;
    }
  };

  const handleAllowLocation = async () => {
    setStep("detecting");

    try {
      let coords;

      if (Capacitor.isNativePlatform()) {
        const permission = await Geolocation.requestPermissions();
        if (permission.location !== 'granted') {
          setStep("manual");
          return;
        }
        const position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 10000
        });
        coords = position.coords;
      } else {
        if (!navigator.geolocation) {
          setStep("manual");
          return;
        }
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000
          });
        });
        coords = position.coords;
      }

      const { latitude, longitude } = coords;
      const { pincode: pc, display } = await reverseGeocode(latitude, longitude);

      if (!pc) {
        setStep("manual");
        return;
      }

      setDetectedPincode(pc);
      setLocationName(display);

      if (checkServiceability(pc)) {
        setStep("serviceable");
        setTimeout(() => saveAddressAndProceed(pc, display, latitude, longitude), 1200);
      } else {
        setStep("not-serviceable");
      }
    } catch (error) {
      console.error("Location error:", error);
      setStep("manual");
    }
  };

  const handleManualCheck = async () => {
    if (pincode.length !== 6) {
      toast({ title: "Invalid PIN code", description: "Please enter a valid 6-digit PIN code.", variant: "destructive" });
      return;
    }
    setLoading(true);
    if (checkServiceability(pincode)) {
      setDetectedPincode(pincode);
      setStep("serviceable");
      setTimeout(() => saveAddressAndProceed(pincode, `PIN ${pincode}`), 1200);
    } else {
      setDetectedPincode(pincode);
      setStep("not-serviceable");
    }
    setLoading(false);
  };

  const handleCityTap = (city: typeof LANDMARK_CITIES[number]) => {
    if (!serviceableSet.has(city.pincode)) {
      toast({ title: `${city.name} coming soon`, description: "We'll launch here very soon!" });
      return;
    }
    setDetectedPincode(city.pincode);
    setStep("serviceable");
    setTimeout(() => saveAddressAndProceed(city.pincode, `${city.name}, ${city.state}`), 1000);
  };

  useEffect(() => {
    // Wait for serviceable set to load before auto-detecting
    if (serviceableSet.size > 0) handleAllowLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceableSet.size > 0]);

  return (
    <div className="min-h-screen bg-background w-full md:max-w-[430px] mx-auto relative overflow-x-hidden pb-12">
      {/* Aurora background */}
      <div className="absolute inset-0 pointer-events-none -z-0">
        <div className="absolute -top-32 -right-24 w-72 h-72 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute top-40 -left-20 w-72 h-72 rounded-full bg-success/10 blur-3xl" />
        <div className="absolute bottom-0 right-10 w-56 h-56 rounded-full bg-accent/10 blur-3xl" />
      </div>

      {/* Header */}
      <div className="relative z-10 px-6 pt-12 pb-6">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 rounded-full bg-primary/10 ring-1 ring-primary/20 px-3 py-1 text-[11px] font-semibold text-primary"
        >
          <Sparkles className="w-3.5 h-3.5" />
          BloodLyn at your doorstep
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mt-3 text-[26px] font-extrabold text-foreground tracking-tight leading-tight"
        >
          Where would you like<br />samples collected?
        </motion.h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We'll find labs serving your area in seconds.
        </p>
      </div>

      {/* Main card */}
      <div className="relative z-10 px-5">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-3xl border border-border/70 bg-card/80 backdrop-blur-xl shadow-lg p-5"
        >
          <AnimatePresence mode="wait">
            {step === "detecting" && (
              <motion.div key="d" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center py-6 text-center">
                <motion.div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-4" animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
                  <Navigation className="w-10 h-10 text-primary" />
                </motion.div>
                <h2 className="text-base font-bold text-foreground">Detecting your location…</h2>
                <p className="text-xs text-muted-foreground mt-1">This only takes a moment</p>
              </motion.div>
            )}

            {step === "manual" && (
              <motion.div key="m" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <label className="text-[11px] uppercase tracking-[0.16em] font-semibold text-muted-foreground">PIN code</label>
                <Input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="6-digit PIN code"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="mt-2 text-center tracking-[0.4em] text-base h-12 rounded-2xl"
                  autoFocus
                />
                <Button
                  variant="hero"
                  className="w-full mt-3 h-12 rounded-2xl"
                  onClick={handleManualCheck}
                  disabled={pincode.length !== 6 || loading}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <MapPin className="w-4 h-4 mr-2" />}
                  Check Availability
                </Button>
                <button
                  onClick={handleAllowLocation}
                  className="w-full mt-3 flex items-center justify-center gap-2 text-sm text-primary font-semibold"
                >
                  <Navigation className="w-4 h-4" />
                  Use my current location
                </button>
              </motion.div>
            )}

            {step === "serviceable" && (
              <motion.div key="s" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center py-4 text-center">
                <motion.div className="w-20 h-20 rounded-2xl bg-success/10 flex items-center justify-center mb-3" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 220 }}>
                  <svg className="w-10 h-10 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <motion.path d="M5 13l4 4L19 7" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, delay: 0.15 }} />
                  </svg>
                </motion.div>
                <h2 className="text-lg font-bold text-foreground">We're available here!</h2>
                <p className="text-xs text-muted-foreground mt-1">PIN {detectedPincode}{locationName ? ` · ${locationName}` : ""}</p>
                <Loader2 className="w-4 h-4 animate-spin text-primary mt-3" />
              </motion.div>
            )}

            {step === "not-serviceable" && (
              <motion.div key="n" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center py-2 text-center">
                <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-3">
                  <AlertCircle className="w-8 h-8 text-destructive" />
                </div>
                <h2 className="text-base font-bold text-foreground">Not in your area yet</h2>
                <p className="text-xs text-muted-foreground mt-1 max-w-[260px]">
                  We don't serve PIN {detectedPincode} yet. Try another PIN or pick a launched city below.
                </p>
                <Button variant="hero" className="w-full mt-4 h-11 rounded-2xl" onClick={() => toast({ title: "We'll notify you!", description: "You'll be first to know when we launch in your area." })}>
                  <Bell className="w-4 h-4 mr-2" /> Notify Me
                </Button>
                <Button variant="outline" className="w-full mt-2 h-11 rounded-2xl" onClick={() => { setStep("manual"); setPincode(""); }}>
                  Try Another PIN
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* City rail */}
      <div className="relative z-10 mt-8 px-5">
        <div className="flex items-end justify-between mb-3">
          <div>
            <h3 className="text-base font-extrabold text-foreground">Available Cities</h3>
            <p className="text-xs text-muted-foreground">Tap a city to jump in instantly</p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="grid grid-cols-4 gap-3">
          {LANDMARK_CITIES.map((city) => {
            const live = serviceableSet.has(city.pincode);
            return (
              <motion.button
                key={city.name}
                whileTap={{ scale: 0.94 }}
                onClick={() => handleCityTap(city)}
                className={`relative rounded-2xl border border-border/60 bg-card overflow-hidden text-left p-2.5 ${
                  !live ? "opacity-55" : ""
                }`}
              >
                <div className={`relative h-14 rounded-xl bg-gradient-to-br ${city.gradient} flex items-center justify-center mb-2`}>
                  <city.Icon className="w-9 h-9 text-foreground/85" />
                  {live && (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-success ring-2 ring-card" />
                  )}
                </div>
                <p className="text-[12px] font-bold text-foreground leading-tight text-center">{city.name}</p>

              </motion.button>
            );
          })}
        </div>
        <p className="text-[11px] text-muted-foreground text-center mt-5">
          Don't see your city? More launching soon.
        </p>
      </div>
    </div>
  );
};

export default LocationCheckScreen;
