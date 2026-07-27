import React, { useState, useEffect } from "react";
import { MapPin, ChevronDown, Bell, Phone, Coins, Crosshair, Check, ShieldCheck, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface ZomatoStyleHeaderProps {
  unreadCount?: number;
  onOpenCall?: () => void;
  greeting?: string;
  activeBookingsCount?: number;
}

export interface AddressItem {
  id: string;
  type: string;
  address_line1: string;
  city?: string;
  state?: string;
  pincode: string;
  is_default?: boolean;
}

export const ZomatoStyleHeader = ({
  unreadCount = 0,
  onOpenCall,
  greeting = "Good Afternoon",
  activeBookingsCount = 0,
}: ZomatoStyleHeaderProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [currentAddress, setCurrentAddress] = useState("Home • 42 Medical Lane, Bandra West");
  const [savedAddresses, setSavedAddresses] = useState<AddressItem[]>([
    { id: "1", type: "Home", address_line1: "42 Medical Lane, Bandra West", city: "Mumbai", pincode: "400050", is_default: true },
    { id: "2", type: "Office", address_line1: "12 Tech Park, BKC", city: "Mumbai", pincode: "400051", is_default: false },
    { id: "3", type: "Parents House", address_line1: "88 Care Street, Dadar", city: "Mumbai", pincode: "400014", is_default: false },
  ]);
  const [switching, setSwitching] = useState<string | null>(null);

  // Load user's real saved addresses from Supabase
  const loadAddresses = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from("addresses")
        .select("id, type, address_line1, city, state, pincode, is_default")
        .eq("user_id", user.id)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });

      if (data && data.length > 0) {
        setSavedAddresses(data.map((a) => ({ ...a, type: a.type ?? "Home", is_default: a.is_default ?? false })));
        const defaultAddr = data.find((a) => a.is_default) || data[0];
        const title = defaultAddr.type || "Home";
        const line = `${defaultAddr.address_line1}${defaultAddr.city ? `, ${defaultAddr.city}` : ''}`;
        setCurrentAddress(`${title} • ${line}`);
      }
    } catch (e) {
      console.error("Failed to fetch user addresses:", e);
    }
  };

  useEffect(() => {
    loadAddresses();
  }, [user]);

  const handleSelectAddress = async (loc: AddressItem) => {
    if (!user) {
      const title = loc.type || "Home";
      const line = `${loc.address_line1}${loc.city ? `, ${loc.city}` : ''}`;
      setCurrentAddress(`${title} • ${line}`);
      setShowLocationModal(false);
      return;
    }

    setSwitching(loc.id);
    try {
      // Set all user addresses to is_default = false
      await supabase.from("addresses").update({ is_default: false }).eq("user_id", user.id);
      // Set chosen address to is_default = true
      await supabase.from("addresses").update({ is_default: true }).eq("id", loc.id);

      const title = loc.type || "Home";
      const line = `${loc.address_line1}${loc.city ? `, ${loc.city}` : ''}`;
      setCurrentAddress(`${title} • ${line}`);

      // Invalidate queries so tests/labs refresh for new pincode
      queryClient.invalidateQueries();
      toast.success(`Location set to ${title} (${loc.pincode})`);
      setShowLocationModal(false);
    } catch (e) {
      toast.error("Failed to update default location");
    } finally {
      setSwitching(null);
    }
  };

  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";

  const addressTitle = currentAddress.split("•")[0]?.trim() || "Delivery Location";
  // De-duplicate repeated fragments (e.g. "PIN 721424, PIN 721424") coming from
  // partially filled address rows so the subtitle always reads cleanly.
  const addressLine = (() => {
    const raw = currentAddress.split("•")[1]?.trim();
    if (!raw) return "Select your location";
    const parts = raw
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    const seen = new Set<string>();
    const unique = parts.filter((p) => {
      const k = p.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    return unique.join(", ");
  })();

  return (
    <div className="flex flex-col gap-2.5 pb-1">
      {/* Top Header Row: Location Selector + Action Buttons */}
      <div className="flex items-center justify-between gap-3">
        {/* Left: Clean Premium Location Selector */}
        <button
          type="button"
          onClick={() => navigate("/saved-addresses")}
          className="flex items-center gap-2.5 min-w-0 flex-1 text-left group active:scale-[0.98] transition-all rounded-2xl py-1"
        >
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <MapPin className="w-4.5 h-4.5" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <span className="text-[13.5px] font-bold text-foreground truncate tracking-tight">
                {addressTitle}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
            </div>
            <p className="text-[11.5px] font-medium text-muted-foreground truncate leading-tight mt-0.5">
              {addressLine}
            </p>
          </div>
        </button>

        {/* Right: Clean Action Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          {onOpenCall && (
            <button
              type="button"
              onClick={onOpenCall}
              className="w-9 h-9 rounded-full bg-muted/70 text-foreground/80 flex items-center justify-center active:scale-90 transition-all hover:bg-muted"
              aria-label="Contact support"
              title="Contact support"
            >
              <Phone className="w-[18px] h-[18px]" />
            </button>
          )}

          <button
            type="button"
            onClick={() => navigate("/rewards")}
            className="w-9 h-9 rounded-full bg-muted/70 text-foreground/80 flex items-center justify-center active:scale-90 transition-all hover:bg-muted"
            aria-label="Rewards"
            title="Rewards"
          >
            <Coins className="w-[18px] h-[18px]" />
          </button>

          {/* Notifications Button */}
          <button
            type="button"
            onClick={() => navigate("/notifications")}
            className="w-9 h-9 rounded-full bg-muted/70 text-foreground/80 flex items-center justify-center relative active:scale-90 transition-all hover:bg-muted"
            aria-label="Notifications"
            title="Notifications"
          >
            <Bell className="w-[18px] h-[18px]" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-background" />
            )}
          </button>
        </div>
      </div>

      {/* Trust line — quiet, single row, never clipped */}
      <div className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground min-w-0">
        <span className="flex items-center gap-1.5 shrink-0 text-emerald-600 dark:text-emerald-400">
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
          15-min collection
        </span>
        <span className="w-px h-3 bg-border shrink-0" />
        <span className="flex items-center gap-1.5 shrink-0">
          <ShieldCheck className="w-3.5 h-3.5 text-primary" />
          NABL certified labs
        </span>
      </div>

      {/* Location Picker Bottom Sheet Modal */}
      <AnimatePresence>
        {showLocationModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-md p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0, y: 120, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 120, scale: 0.95 }}
              transition={{ type: "spring", damping: 28, stiffness: 350 }}
              className="w-full max-w-md bg-card/95 backdrop-blur-2xl rounded-t-3xl sm:rounded-3xl p-6 border border-border/80 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-foreground tracking-tight">Select Delivery Location</h3>
                  <p className="text-xs font-medium text-muted-foreground mt-0.5">Select sample pickup address for instant home collection</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLocationModal(false)}
                  className="w-8.5 h-8.5 rounded-full bg-muted/80 flex items-center justify-center text-muted-foreground font-bold hover:bg-accent hover:text-foreground transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-2.5 pt-1 max-h-[50vh] overflow-y-auto pr-1">
                {savedAddresses.map((loc) => {
                  const title = loc.type || "Home";
                  const addrLine = `${loc.address_line1}${loc.city ? `, ${loc.city}` : ''} (${loc.pincode})`;
                  const isCurrent = currentAddress.startsWith(title) || loc.is_default;
                  const isBusy = switching === loc.id;
                  return (
                    <button
                      key={loc.id}
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleSelectAddress(loc)}
                      className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                        isCurrent
                          ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary/30"
                          : "border-border/60 hover:bg-accent/40"
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className={`w-8.5 h-8.5 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                          isCurrent ? "bg-primary text-white shadow-xs" : "bg-muted text-muted-foreground"
                        }`}>
                          {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-foreground">{title}</h4>
                          <p className="text-xs font-medium text-muted-foreground leading-tight mt-0.5 truncate">{addrLine}</p>
                        </div>
                      </div>
                      {isCurrent && <Check className="w-4.5 h-4.5 text-primary shrink-0 mt-2" />}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowLocationModal(false);
                  navigate("/saved-addresses");
                }}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-primary via-primary to-indigo-600 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/30 active:scale-[0.98] transition-all hover:brightness-105 mt-2"
              >
                <Crosshair className="w-4.5 h-4.5" />
                Add New Address
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
