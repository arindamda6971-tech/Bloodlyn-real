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
    <div className="flex flex-col gap-3 pb-1">
      {/* Top Header Card Container */}
      <div className="relative rounded-3xl bg-gradient-to-b from-card/90 via-card/80 to-card/60 backdrop-blur-2xl border border-border/50 p-3.5 shadow-[0_10px_35px_-10px_rgba(0,0,0,0.06)] overflow-hidden">
        {/* Subtle Ambient Radial Glow Backdrops */}
        <div className="pointer-events-none absolute -top-12 -left-12 w-44 h-44 rounded-full bg-gradient-to-br from-primary/15 via-rose-500/10 to-transparent blur-3xl" />
        <div className="pointer-events-none absolute -top-12 -right-12 w-44 h-44 rounded-full bg-gradient-to-bl from-indigo-500/15 via-sky-500/10 to-transparent blur-3xl" />

        <div className="relative flex items-center justify-between gap-3">
          {/* Left: Ultra-Futuristic Location Selector */}
          <button
            type="button"
            onClick={() => setShowLocationModal(true)}
            className="flex items-center gap-3 min-w-0 text-left group p-1 -ml-1 rounded-2xl active:scale-[0.98] transition-all hover:bg-accent/40"
          >
            <div className="relative shrink-0">
              {/* Multi-layered 3D Glowing Location Orb */}
              <div className="absolute -inset-1.5 rounded-2xl bg-gradient-to-br from-rose-500 via-primary to-indigo-600 opacity-50 blur-md group-hover:opacity-85 transition-opacity" />
              
              <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-br from-rose-500 via-primary to-indigo-600 shadow-[0_8px_24px_-4px_rgba(225,29,72,0.45)] flex items-center justify-center text-white ring-2 ring-white/70 dark:ring-white/15">
                <MapPin className="w-5.5 h-5.5 fill-white/25 text-white drop-shadow-md" />
              </div>

              {/* Pulsing Live Online Radar Dot */}
              <span className="absolute -bottom-0.5 -right-0.5 w-4.5 h-4.5 rounded-full bg-emerald-500 ring-2 ring-card flex items-center justify-center shadow-md">
                <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[14.5px] font-black tracking-tight text-foreground group-hover:text-primary transition-colors truncate">
                  {currentAddress.split("•")[0]?.trim() || "Delivery Location"}
                </span>
                <ChevronDown className="w-4 h-4 text-primary shrink-0 transition-transform group-hover:translate-y-0.5" />
              </div>
              <p className="text-[11.5px] font-bold text-muted-foreground/90 truncate leading-tight mt-0.5">
                {currentAddress.split("•")[1]?.trim() || "Select your location"}
              </p>
            </div>
          </button>

          {/* Right: Floating Glass Capsule Action Center */}
          <div className="flex items-center gap-2 bg-muted/40 p-1.5 rounded-2xl border border-border/40 shrink-0">
            {onOpenCall && (
              <button
                type="button"
                onClick={onOpenCall}
                className="w-9.5 h-9.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 flex items-center justify-center active:scale-90 transition-all text-sky-500"
                title="Doctor Consultation Call"
              >
                <Phone className="w-4.5 h-4.5 fill-sky-500/20" />
              </button>
            )}

            {/* 3D Rotating Gold Coin Rewards Button */}
            <button
              type="button"
              onClick={() => navigate("/rewards")}
              className="relative w-9.5 h-9.5 rounded-xl bg-gradient-to-br from-amber-400/20 via-yellow-500/15 to-amber-600/20 hover:from-amber-400/30 hover:to-yellow-500/30 border border-amber-400/40 shadow-[0_0_14px_rgba(245,158,11,0.25)] flex items-center justify-center active:scale-90 transition-all text-amber-500 overflow-hidden group"
              title="HealthSwift Rewards Coins"
            >
              <motion.div
                animate={{ rotateY: [0, 360] }}
                transition={{ repeat: Infinity, duration: 3.5, ease: "linear" }}
                className="flex items-center justify-center text-amber-500 drop-shadow-[0_2px_4px_rgba(217,119,6,0.5)]"
                style={{ transformStyle: "preserve-3d" }}
              >
                <Coins className="w-5 h-5 text-amber-400 fill-amber-400/30" />
              </motion.div>
            </button>

            {/* Notifications Button */}
            <button
              type="button"
              onClick={() => navigate("/notifications")}
              className="w-9.5 h-9.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 flex items-center justify-center relative active:scale-90 transition-all text-rose-500"
              title="Notifications"
            >
              <Bell className="w-4.5 h-4.5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 bg-gradient-to-r from-rose-500 to-red-600 rounded-full flex items-center justify-center text-[9.5px] font-black text-white ring-2 ring-card shadow-md animate-pulse">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Live Service Status Bar inside header card */}
        <div className="mt-3 pt-2.5 border-t border-border/30 flex items-center justify-between gap-2 overflow-x-auto hide-scrollbar">
          <div className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-emerald-500/15 border border-emerald-500/30 px-3 py-1 rounded-full text-emerald-600 dark:text-emerald-400 shrink-0 shadow-sm">
            <Zap className="w-3.5 h-3.5 fill-emerald-500 text-emerald-500 animate-pulse" />
            <span className="text-[11px] font-black tracking-tight">Express 15-min Home Sample Collection</span>
          </div>

          <div className="flex items-center gap-1.5 bg-gradient-to-r from-primary/15 via-indigo-500/10 to-primary/15 border border-primary/30 px-3 py-1 rounded-full text-primary shrink-0 shadow-sm">
            <ShieldCheck className="w-3.5 h-3.5 text-primary" />
            <span className="text-[11px] font-black">NABL Certified Labs</span>
          </div>

          {activeBookingsCount > 0 && (
            <div className="flex items-center gap-1.5 bg-gradient-to-r from-indigo-500/15 via-purple-500/10 to-indigo-500/15 border border-indigo-500/30 px-3 py-1 rounded-full text-indigo-600 dark:text-indigo-400 shrink-0 shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span className="text-[11px] font-black">{activeBookingsCount} Active Bookings</span>
            </div>
          )}
        </div>
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
