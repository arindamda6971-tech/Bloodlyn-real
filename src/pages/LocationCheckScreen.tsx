import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Navigation, Loader2, AlertCircle, Bell, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Geolocation } from "@capacitor/geolocation";
import { Capacitor } from "@capacitor/core";
import { sanitizePincode } from "@/utils/inputSanitizers";

/**
 * Serviceability gate — runs once right after login.
 * Rebuilt for speed: no framer-motion, no blocking loaders, no heavy artwork.
 * The PIN input is interactive from the first paint; the serviceable-PIN set is
 * warmed in the background and the check falls back to a direct DB query.
 */

type Step = "input" | "checking" | "serviceable" | "not-serviceable";

const LocationCheckScreen = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState<Step>("input");
  const [pincode, setPincode] = useState("");
  const [checkedPin, setCheckedPin] = useState("");
  const [locationName, setLocationName] = useState("");
  const [busy, setBusy] = useState(false);

  const serviceableRef = useRef<Set<string>>(new Set());
  // Single-flight guards — prevent StrictMode / double-tap duplicate inserts
  const savingRef = useRef(false);
  const savedKeyRef = useRef<string | null>(null);

  /** Collect every serviceable PIN from a diagnostic_centers row set. */
  const collectPins = (rows: any[]) => {
    const set = new Set<string>();
    rows.forEach((lab) => {
      if (Array.isArray(lab?.service_pincodes)) {
        lab.service_pincodes.forEach((p: unknown) => {
          const v = String(p).trim();
          if (/^\d{6}$/.test(v)) set.add(v);
        });
      }
      const raw = (lab?.pincode || "").trim();
      if (raw) {
        raw.split(/[,;\s]+/).forEach((p: string) => {
          const v = p.trim();
          if (/^\d{6}$/.test(v)) set.add(v);
        });
      }
    });
    return set;
  };

  // Warm the serviceable set in the background — never blocks the UI.
  useEffect(() => {
    let cancelled = false;
    supabase
      .from("diagnostic_centers")
      .select("pincode, service_pincodes")
      .eq("is_active", true)
      .then(({ data }) => {
        if (cancelled || !data) return;
        serviceableRef.current = collectPins(data as any[]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /** True when any active lab serves this PIN. Uses cache, else queries live. */
  const checkServiceability = useCallback(async (pc: string): Promise<boolean> => {
    const target = pc.trim();
    if (serviceableRef.current.has(target)) return true;
    try {
      const { data } = await supabase
        .from("diagnostic_centers")
        .select("pincode, service_pincodes")
        .eq("is_active", true);
      if (!data) return false;
      const set = collectPins(data as any[]);
      serviceableRef.current = set;
      return set.has(target);
    } catch {
      return false;
    }
  }, []);

  /**
   * Save the default address (idempotent) and enter the app.
   * Same contract as before: one default address per user, keyed by pincode.
   */
  const saveAddressAndProceed = useCallback(
    async (pc: string, displayName: string, lat?: number, lon?: number) => {
      if (!user) {
        setStep("input");
        toast({
          title: "Session not ready",
          description: "Please wait a moment and try again.",
          variant: "destructive",
        });
        return;
      }
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
          const { error: insertError } = await supabase.from("addresses").insert({
            user_id: user.id,
            address_line1: displayName || `Location - ${pc}`,
            city: displayName.split(",")[0]?.trim() || "",
            state: displayName.split(",")[1]?.trim() || "",
            pincode: pc.trim(),
            latitude: lat ?? null,
            longitude: lon ?? null,
            is_default: true,
            type: "Home",
          });
          if (insertError) throw insertError;
        }
        savedKeyRef.current = key;
        try { localStorage.setItem(`location_checked_${user.id}`, "true"); } catch { /* ignore */ }
        navigate("/home", { replace: true });
      } catch (e) {
        console.error("Failed to save address:", e);
        savingRef.current = false;
        setStep("input");
        toast({
          title: "Couldn't save your location",
          description: "Please check your connection and try again.",
          variant: "destructive",
        });
      }
    },
    [navigate, user],
  );

  const runCheck = useCallback(
    async (pc: string, displayName: string, lat?: number, lon?: number) => {
      setBusy(true);
      setCheckedPin(pc);
      setStep("checking");
      const ok = await checkServiceability(pc);
      setBusy(false);
      if (ok) {
        setStep("serviceable");
        saveAddressAndProceed(pc, displayName, lat, lon);
      } else {
        setStep("not-serviceable");
      }
    },
    [checkServiceability, saveAddressAndProceed],
  );

  const handleManualCheck = () => {
    if (pincode.length !== 6) {
      toast({ title: "Invalid PIN code", description: "Please enter a valid 6-digit PIN code.", variant: "destructive" });
      return;
    }
    setLocationName("");
    runCheck(pincode, `PIN ${pincode}`);
  };

  const reverseGeocode = async (lat: number, lon: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`,
      );
      const data = await res.json();
      const addr = data.address || {};
      const city = addr.city || addr.town || addr.village || addr.county || "";
      return {
        pincode: String(addr.postcode || "").replace(/\D/g, "").slice(0, 6),
        display: `${city}${addr.state ? ", " + addr.state : ""}`,
      };
    } catch {
      return { pincode: "", display: "" };
    }
  };

  const handleUseMyLocation = async () => {
    setBusy(true);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Location timeout")), 8000),
    );
    try {
      let coords: { latitude: number; longitude: number };
      if (Capacitor.isNativePlatform()) {
        const permission = await Geolocation.requestPermissions();
        if (permission.location !== "granted") throw new Error("Permission denied");
        const position: any = await Promise.race([
          Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: 7000, maximumAge: 300000 }),
          timeoutPromise,
        ]);
        coords = position.coords;
      } else {
        if (!navigator.geolocation) throw new Error("Unsupported");
        const position = (await Promise.race([
          new Promise<GeolocationPosition>((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: false,
              timeout: 7000,
              maximumAge: 300000,
            }),
          ),
          timeoutPromise,
        ])) as GeolocationPosition;
        coords = position.coords;
      }

      const geo = (await Promise.race([
        reverseGeocode(coords.latitude, coords.longitude),
        new Promise<{ pincode: string; display: string }>((resolve) =>
          setTimeout(() => resolve({ pincode: "", display: "" }), 4000),
        ),
      ])) as { pincode: string; display: string };

      if (!/^\d{6}$/.test(geo.pincode)) {
        setBusy(false);
        toast({
          title: "Couldn't detect your PIN",
          description: "Please type your 6-digit PIN code instead.",
        });
        return;
      }
      setPincode(geo.pincode);
      setLocationName(geo.display);
      await runCheck(geo.pincode, geo.display || `PIN ${geo.pincode}`, coords.latitude, coords.longitude);
    } catch (error) {
      console.warn("Location detection failed:", error);
      setBusy(false);
      toast({
        title: "Location unavailable",
        description: "Please enter your PIN code manually.",
      });
    }
  };

  return (
    <div className="min-h-[100dvh] w-full md:max-w-[430px] mx-auto bg-background flex flex-col px-6 pt-[calc(var(--sat,0px)+40px)] pb-10">
      {/* Header */}
      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
        <MapPin className="w-7 h-7 text-primary" />
      </div>
      <h1 className="text-[24px] font-extrabold text-foreground leading-tight tracking-tight">
        Where should we collect<br />your sample?
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Enter your PIN code — we'll show labs serving your area.
      </p>

      {/* Card */}
      <div className="mt-6 rounded-3xl border border-border/60 bg-card shadow-sm p-5">
        {(step === "input" || step === "checking") && (
          <>
            <label htmlFor="pin" className="text-[11px] uppercase tracking-[0.16em] font-semibold text-muted-foreground">
              PIN code
            </label>
            <Input
              id="pin"
              type="text"
              inputMode="numeric"
              autoComplete="postal-code"
              maxLength={6}
              placeholder="6-digit PIN code"
              value={pincode}
              onChange={(e) => setPincode(sanitizePincode(e.target.value))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && pincode.length === 6 && !busy) handleManualCheck();
              }}
              className="mt-2 text-center tracking-[0.4em] text-base h-12 rounded-2xl"
              autoFocus
            />
            <Button
              variant="hero"
              className="w-full mt-3 h-12 rounded-2xl"
              onClick={handleManualCheck}
              disabled={pincode.length !== 6 || busy}
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <MapPin className="w-4 h-4 mr-2" />}
              Check Availability
            </Button>
            <button
              onClick={handleUseMyLocation}
              disabled={busy}
              className="w-full mt-3 flex items-center justify-center gap-2 text-sm text-primary font-semibold disabled:opacity-50"
            >
              <Navigation className="w-4 h-4" />
              Use my current location
            </button>
          </>
        )}

        {step === "serviceable" && (
          <div className="flex flex-col items-center py-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-success/10 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-9 h-9 text-success" />
            </div>
            <h2 className="text-lg font-bold text-foreground">We're available here!</h2>
            <p className="text-xs text-muted-foreground mt-1">
              PIN {checkedPin}
              {locationName ? ` · ${locationName}` : ""}
            </p>
            <Loader2 className="w-4 h-4 animate-spin text-primary mt-3" />
          </div>
        )}

        {step === "not-serviceable" && (
          <div className="flex flex-col items-center py-2 text-center">
            <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-3">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-base font-bold text-foreground">Not in your area yet</h2>
            <p className="text-xs text-muted-foreground mt-1 max-w-[260px]">
              We don't serve PIN {checkedPin} yet. Try another PIN code.
            </p>
            <Button
              variant="hero"
              className="w-full mt-4 h-11 rounded-2xl"
              onClick={() =>
                toast({
                  title: "We'll notify you!",
                  description: "You'll be first to know when we launch in your area.",
                })
              }
            >
              <Bell className="w-4 h-4 mr-2" /> Notify Me
            </Button>
            <Button
              variant="outline"
              className="w-full mt-2 h-11 rounded-2xl"
              onClick={() => {
                setStep("input");
                setPincode("");
              }}
            >
              Try Another PIN
            </Button>
          </div>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground text-center mt-6">
        Home collection is currently available in select PIN codes. More launching soon.
      </p>
    </div>
  );
};

export default LocationCheckScreen;
