import React, { useState, useEffect } from "react";
import { MapPin, ChevronDown, Bell, Phone, Coins, Crosshair, Check, ShieldCheck, Loader2, ShoppingCart, X, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useCart } from "@/contexts/CartContext";

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
  const { items } = useCart();
  const cartCount = items.length;
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
    <div className="flex flex-col pb-2 pt-1">
      {/* Top Header Row: Location Selector + Action Buttons */}
      <div className="flex items-start justify-between pb-3 gap-2">
        {/* Left: Premium Greeting & Location Selector */}
        <div className="flex flex-col min-w-0 flex-1 pr-2 pt-1">
          <p className="text-[11px] font-black text-primary uppercase tracking-[0.15em] mb-1 flex items-center gap-1 opacity-90">
             {greeting}, {userName.split(' ')[0]}
          </p>
          <button 
             type="button"
             onClick={() => setShowLocationModal(true)}
             className="flex items-center gap-1 text-left group min-w-0"
          >
             <h2 className="text-[22px] font-black text-foreground tracking-tight truncate leading-none">
               {addressTitle}
             </h2>
             <ChevronDown className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
          </button>
          <p className="text-xs text-muted-foreground font-medium truncate mt-1.5 flex items-center gap-1.5 opacity-80">
             <MapPin className="w-3.5 h-3.5 shrink-0" />
             {addressLine}
          </p>
        </div>

        {/* Right: Clean Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => navigate("/cart")}
            className="w-[42px] h-[42px] rounded-full bg-card shadow-sm border border-border/40 text-foreground/80 flex items-center justify-center relative active:scale-90 transition-all hover:border-primary/40 hover:shadow-md"
            aria-label="Cart"
            title="Cart"
          >
            <ShoppingCart className="w-5 h-5" />
            {cartCount > 0 && (
              <motion.span 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-background shadow-sm" 
              >
                {cartCount}
              </motion.span>
            )}
          </button>

          {/* Notifications Button */}
          <button
            type="button"
            onClick={() => navigate("/notifications")}
            className="w-[42px] h-[42px] rounded-full bg-card shadow-sm border border-border/40 text-foreground/80 flex items-center justify-center relative active:scale-90 transition-all hover:border-primary/40 hover:shadow-md"
            aria-label="Notifications"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-background" />
            )}
          </button>
        </div>
      </div>

      {/* Location Picker Bottom Sheet Modal */}
      {createPortal(
        <AnimatePresence>
          {showLocationModal && (
            <motion.div
              key="location-modal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md px-5"
              onClick={() => setShowLocationModal(false)}
            >
              <motion.div
                key="location-modal-content"
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                transition={{ type: "spring", damping: 28, stiffness: 350 }}
                className="w-full max-w-sm bg-card/95 backdrop-blur-2xl rounded-[2rem] p-6 border border-border/80 shadow-2xl space-y-4"
                onClick={(e) => e.stopPropagation()}
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
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};
