import React, { useState } from "react";
import { MapPin, ChevronDown, Bell, Phone, Wallet, Zap, Sparkles, User, Crosshair, Check } from "lucide-react";
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
    <div className="flex flex-col gap-3 pb-0.5">
      {/* Top Bar: Location Selector + Action Icon Buttons */}
      <div className="flex items-center justify-between gap-3">
        {/* Left: Ultra-Professional Zomato/Swiggy Style Location Selector */}
        <button
          type="button"
          onClick={() => setShowLocationModal(true)}
          className="flex items-center gap-3 min-w-0 text-left group p-1.5 -ml-1.5 rounded-2xl active:scale-[0.98] transition-all hover:bg-accent/40"
        >
          <div className="relative shrink-0">
            {/* Ambient Glow Aura */}
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-rose-500 via-primary to-indigo-600 opacity-40 blur-md group-hover:opacity-70 transition-opacity" />
            
            {/* Medallion Icon */}
            <div className="relative w-10.5 h-10.5 rounded-2xl bg-gradient-to-br from-rose-500 via-primary to-indigo-600 shadow-[0_6px_20px_-4px_rgba(225,29,72,0.4)] flex items-center justify-center text-white ring-2 ring-white/60 dark:ring-white/10">
              <MapPin className="w-5 h-5 fill-white/20 text-white" />
            </div>

            {/* Pulsing Live Status Indicator */}
            <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-background flex items-center justify-center shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[14px] font-black tracking-tight text-foreground group-hover:text-primary transition-colors truncate">
                {currentAddress.split("•")[0]?.trim() || "Delivery Location"}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-primary shrink-0 transition-transform group-hover:translate-y-0.5" />
            </div>
            <p className="text-[11.5px] font-semibold text-muted-foreground/90 truncate leading-tight mt-0.5">
              {currentAddress.split("•")[1]?.trim() || "Select your location"}
            </p>
          </div>
        </button>

        {/* Right: Quick Action Glassmorphic Icon Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {onOpenCall && (
            <button
              type="button"
              onClick={onOpenCall}
              className="w-10 h-10 rounded-2xl bg-card/90 backdrop-blur-md border border-border/50 shadow-[0_4px_14px_-4px_rgba(0,0,0,0.06)] flex items-center justify-center active:scale-90 hover:scale-105 hover:border-sky-500/40 hover:shadow-sky-500/10 transition-all text-foreground"
              title="Doctor Consultation Call"
            >
              <Phone className="w-4.5 h-4.5 text-sky-500" />
            </button>
          )}

          <button
            type="button"
            onClick={() => navigate("/rewards")}
            className="w-10 h-10 rounded-2xl bg-card/90 backdrop-blur-md border border-border/50 shadow-[0_4px_14px_-4px_rgba(0,0,0,0.06)] flex items-center justify-center active:scale-90 hover:scale-105 hover:border-amber-500/40 hover:shadow-amber-500/10 transition-all text-foreground"
            title="Rewards & Wallet"
          >
            <Wallet className="w-4.5 h-4.5 text-amber-500" />
          </button>

          <button
            type="button"
            onClick={() => navigate("/notifications")}
            className="w-10 h-10 rounded-2xl bg-card/90 backdrop-blur-md border border-border/50 shadow-[0_4px_14px_-4px_rgba(0,0,0,0.06)] flex items-center justify-center relative active:scale-90 hover:scale-105 hover:border-primary/40 transition-all text-foreground"
            title="Notifications"
          >
            <Bell className="w-4.5 h-4.5 text-foreground" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-gradient-to-r from-rose-500 to-red-600 rounded-full flex items-center justify-center text-[10px] font-black text-white ring-2 ring-background shadow-md">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => navigate("/profile")}
            className="p-[1.5px] rounded-2xl bg-gradient-to-br from-primary via-indigo-500 to-sky-400 shadow-[0_4px_14px_-4px_rgba(59,130,246,0.3)] active:scale-90 hover:scale-105 transition-all shrink-0"
            title="User Profile"
          >
            <div className="w-9.5 h-9.5 rounded-[14px] bg-card flex items-center justify-center">
              <User className="w-4.5 h-4.5 text-primary" />
            </div>
          </button>
        </div>
      </div>

      {/* Sub-header Banner: Live Express Status & Active Bookings Glass Pills */}
      <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pt-0.5 pb-0.5">
        <div className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-emerald-500/15 border border-emerald-500/30 px-3 py-1.2 rounded-full text-emerald-600 dark:text-emerald-400 shrink-0 shadow-sm">
          <Zap className="w-3.5 h-3.5 fill-emerald-500 text-emerald-500" />
          <span className="text-[11.5px] font-extrabold tracking-tight">Express 15-min Home Sample Collection</span>
        </div>

        {activeBookingsCount > 0 && (
          <div className="flex items-center gap-1.5 bg-gradient-to-r from-primary/15 via-indigo-500/10 to-primary/15 border border-primary/30 px-3 py-1.2 rounded-full text-primary shrink-0 shadow-sm">
            <Sparkles className="w-3.5 h-3.5" />
            <span className="text-[11.5px] font-black">{activeBookingsCount} Active Bookings</span>
          </div>
        )}
      </div>

      {/* Ultra-Professional Location Picker Modal */}
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
