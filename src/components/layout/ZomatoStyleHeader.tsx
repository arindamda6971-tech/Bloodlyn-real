import React, { useState, useEffect } from "react";
import { MapPin, ChevronDown, Bell, Phone, Coins, Crosshair, Check, ShieldCheck, Loader2, ShoppingCart, X, Plus, Pencil } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useCart } from "@/contexts/CartContext";
import { isCompleteCollectionAddress, setServicePincode } from "@/lib/service-pincode";
import { useUserPincode } from "@/hooks/useUserPincode";

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
  const { pincode } = useUserPincode();
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [currentAddress, setCurrentAddress] = useState("Delivery PIN • Select your service area");
  const [savedAddresses, setSavedAddresses] = useState<AddressItem[]>([]);
  const [switching, setSwitching] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);


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

      const completeAddresses = (data || []).filter(isCompleteCollectionAddress);
      if (completeAddresses.length > 0) {
        setSavedAddresses(completeAddresses.map((a) => ({ ...a, type: a.type ?? "Home", is_default: a.is_default ?? false })));
        const defaultAddr = completeAddresses.find((a) => a.is_default) || completeAddresses[0];
        const title = defaultAddr.type || "Home";
        const line = `${defaultAddr.address_line1}${defaultAddr.city ? `, ${defaultAddr.city}` : ''}`;
        setCurrentAddress(`${title} • ${line}`);
        setSelectedId(defaultAddr.id);
      } else {
        setSavedAddresses([]);
        setSelectedId(null);
        setCurrentAddress(`Delivery PIN • ${pincode || "Select your service area"}`);
      }


    } catch (e) {
      console.error("Failed to fetch user addresses:", e);
    }
  };

  useEffect(() => {
    loadAddresses();
  }, [user, pincode]);

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
      setSelectedId(loc.id);
      setSavedAddresses((prev) => prev.map((a) => ({ ...a, is_default: a.id === loc.id })));
      setServicePincode(user.id, loc.pincode);



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
      <Drawer
        open={showLocationModal}
        onOpenChange={(o) => {
          setShowLocationModal(o);
          if (o) loadAddresses();
        }}
      >
        <DrawerContent className="px-6 pb-8 bg-background border-border rounded-t-[2rem] shadow-2xl">
          <DrawerHeader className="px-0 pt-6 text-left">
            <DrawerTitle className="text-xl font-black text-foreground tracking-tight">Select Delivery Location</DrawerTitle>
            <DrawerDescription className="text-xs font-medium mt-1">Select sample pickup address for instant home collection</DrawerDescription>
          </DrawerHeader>


          <div className="space-y-2.5 max-h-[50vh] overflow-y-auto mt-2">
            {savedAddresses.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border p-6 text-center">
                <MapPin className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm font-bold text-foreground">No saved addresses</p>
                <p className="text-xs text-muted-foreground mt-1">Add one to book home collection.</p>
              </div>
            )}
            {savedAddresses.map((loc) => {
              const title = loc.type || "Home";
              const addrLine = `${loc.address_line1}${loc.city ? `, ${loc.city}` : ''} (${loc.pincode})`;
              const isCurrent = selectedId ? selectedId === loc.id : !!loc.is_default;
              const isBusy = switching === loc.id;
              return (
                <div
                  key={loc.id}
                  className={`w-full rounded-2xl border transition-all ${
                    isCurrent
                      ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20"
                      : "border-border/60 hover:bg-accent/40"
                  }`}
                >
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleSelectAddress(loc)}
                    className="w-full text-left p-4 flex items-start justify-between gap-3"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        isCurrent ? "bg-primary text-white shadow-xs" : "bg-muted text-muted-foreground"
                      }`}>
                        {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-foreground">{title}</h4>
                        <p className="text-xs font-medium text-muted-foreground leading-tight mt-0.5 truncate">{addrLine}</p>
                      </div>
                    </div>
                    {isCurrent && <Check className="w-5 h-5 text-primary shrink-0 mt-2" />}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="flex gap-2 mt-6">
            <button
              type="button"
              onClick={() => {
                setShowLocationModal(false);
                navigate("/saved-addresses");
              }}
              className="flex-1 py-4 rounded-2xl border border-border bg-card text-foreground font-black text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
            >
              <Pencil className="w-4 h-4" />
              Manage
            </button>
            <button
              type="button"
              onClick={() => {
                setShowLocationModal(false);
                navigate("/saved-addresses?add=1");
              }}
              className="flex-[1.4] py-4 rounded-2xl bg-gradient-to-r from-primary via-primary to-indigo-600 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/30 active:scale-[0.98] transition-all hover:brightness-105"
            >
              <Crosshair className="w-5 h-5" />
              Add New Address
            </button>
          </div>
          <Button
            type="button"
            variant="ghost"
            className="w-full mt-3 text-primary"
            onClick={() => {
              setShowLocationModal(false);
              navigate("/location-check");
            }}
          >
            <MapPin className="w-4 h-4 mr-2" />
            Change service PIN
          </Button>

        </DrawerContent>
      </Drawer>
    </div>
  );
};
