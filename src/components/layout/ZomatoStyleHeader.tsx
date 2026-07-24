import React, { useState } from "react";
import { MapPin, ChevronDown, Bell, Phone, Coins, Zap, Sparkles, User, Crosshair, Check, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface ZomatoStyleHeaderProps {
  unreadCount?: number;
  onOpenCall?: () => void;
  greeting?: string;
  activeBookingsCount?: number;
}

export const ZomatoStyleHeader = ({
  unreadCount = 0,
  onOpenCall,
  greeting = "Good Afternoon",
  activeBookingsCount = 0,
}: ZomatoStyleHeaderProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [currentAddress, setCurrentAddress] = useState("Home • 42 Medical Lane, Bandra West");
  const [savedAddresses] = useState([
    { id: "1", title: "Home", addr: "42 Medical Lane, Bandra West, Mumbai 400050", active: true },
    { id: "2", title: "Office", addr: "12 Tech Park, BKC, Mumbai 400051", active: false },
    { id: "3", title: "Parents House", addr: "88 Care Street, Dadar, Mumbai 400014", active: false },
  ]);

  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";

  return (
    <div className="flex flex-col gap-2.5 pb-1">
      {/* Top Header Row: Location Selector + Action Buttons */}
      <div className="flex items-center justify-between gap-3">
        {/* Left: Clean Premium Location Selector */}
        <button
          type="button"
          onClick={() => setShowLocationModal(true)}
          className="flex items-center gap-2.5 min-w-0 text-left group active:scale-[0.98] transition-all bg-card/60 hover:bg-card border border-border/40 px-3 py-1.5 rounded-2xl shadow-2xs"
        >
          <div className="w-8.5 h-8.5 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 shadow-2xs">
            <MapPin className="w-4.5 h-4.5" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <span className="text-[13.5px] font-extrabold text-foreground truncate">
                {currentAddress.split("•")[0]?.trim() || "Delivery Location"}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
            </div>
            <p className="text-[11px] font-semibold text-muted-foreground truncate leading-tight">
              {currentAddress.split("•")[1]?.trim() || "Select your location"}
            </p>
          </div>
        </button>

        {/* Right: Clean Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {onOpenCall && (
            <button
              type="button"
              onClick={onOpenCall}
              className="w-9 h-9 rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 flex items-center justify-center active:scale-90 transition-transform shadow-2xs hover:bg-sky-500/20"
              title="Doctor Consultation Call"
            >
              <Phone className="w-4 h-4" />
            </button>
          )}

          {/* 3D Rotating Gold Coin Rewards Button */}
          <button
            type="button"
            onClick={() => navigate("/rewards")}
            className="w-9 h-9 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center active:scale-90 transition-transform overflow-hidden shadow-2xs hover:bg-amber-500/20"
            title="HealthSwift Rewards Coins"
          >
            <motion.div
              animate={{ rotateY: [0, 360] }}
              transition={{ repeat: Infinity, duration: 3.5, ease: "linear" }}
              className="flex items-center justify-center"
              style={{ transformStyle: "preserve-3d" }}
            >
              <Coins className="w-4.5 h-4.5 text-amber-500 fill-amber-400/40" />
            </motion.div>
          </button>

          {/* Notifications Button */}
          <button
            type="button"
            onClick={() => navigate("/notifications")}
            className="w-9 h-9 rounded-2xl bg-card border border-border/60 text-foreground flex items-center justify-center relative active:scale-90 transition-transform shadow-2xs hover:border-primary/40"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-background animate-pulse" />
            )}
          </button>
        </div>
      </div>

      {/* Live Service Status Bar */}
      <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pt-0.5">
        <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full text-emerald-700 dark:text-emerald-300 shrink-0 text-[11px] font-bold shadow-2xs">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>Express 15-min Collection</span>
        </div>

        <div className="flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-full text-blue-700 dark:text-blue-300 shrink-0 text-[11px] font-bold shadow-2xs">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
          <span>NABL Certified Labs</span>
        </div>

        {activeBookingsCount > 0 && (
          <div className="flex items-center gap-1.5 bg-purple-500/10 border border-purple-500/20 px-3 py-1 rounded-full text-purple-700 dark:text-purple-300 shrink-0 text-[11px] font-bold shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-purple-500" />
            <span>{activeBookingsCount} Active Bookings</span>
          </div>
        )}
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

              <div className="space-y-2.5 pt-1">
                {savedAddresses.map((loc) => {
                  const isCurrent = currentAddress.startsWith(loc.title);
                  return (
                    <button
                      key={loc.id}
                      type="button"
                      onClick={() => {
                        setCurrentAddress(`${loc.title} • ${loc.addr}`);
                        setShowLocationModal(false);
                      }}
                      className={`w-full text-left p-4 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                        isCurrent
                          ? "border-primary bg-primary/10 shadow-md shadow-primary/5 ring-1 ring-primary/30"
                          : "border-border/60 hover:bg-accent/40"
                      }`}
                    >
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                          isCurrent ? "bg-primary text-white shadow-sm" : "bg-muted text-muted-foreground"
                        }`}>
                          <MapPin className="w-4.5 h-4.5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-foreground">{loc.title}</h4>
                          <p className="text-xs font-medium text-muted-foreground leading-tight mt-0.5 truncate">{loc.addr}</p>
                        </div>
                      </div>
                      {isCurrent && <Check className="w-5 h-5 text-primary shrink-0 mt-2" />}
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
