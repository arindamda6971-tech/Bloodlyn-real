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
    <div className="flex flex-col gap-2.5 pb-1">
      {/* Top Bar: Location Selector + Action Icon Buttons */}
      <div className="flex items-center justify-between gap-3">
        {/* Left: Zomato/Swiggy Style Location Selector */}
        <button
          type="button"
          onClick={() => setShowLocationModal(true)}
          className="flex items-center gap-2.5 min-w-0 text-left group py-1 px-1.5 rounded-2xl active:scale-[0.98] transition-transform hover:bg-accent/30"
        >
          <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-500 via-primary to-indigo-600 shadow-md shadow-primary/25 flex items-center justify-center text-white ring-2 ring-white/50 dark:ring-white/10">
              <MapPin className="w-5 h-5 fill-white/20 animate-bounce-slow" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-background flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[13px] font-black tracking-tight text-foreground group-hover:text-primary transition-colors truncate">
                {currentAddress.split("•")[0]?.trim() || "Delivery Location"}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-primary shrink-0 transition-transform group-hover:translate-y-0.5" />
            </div>
            <p className="text-[11px] font-semibold text-muted-foreground truncate leading-tight mt-0.5">
              {currentAddress.split("•")[1]?.trim() || "Select your location"}
            </p>
          </div>
        </button>

        {/* Right: Quick Action Buttons (Call, Wallet, Notifications, User Avatar) */}
        <div className="flex items-center gap-2 shrink-0">
          {onOpenCall && (
            <button
              type="button"
              onClick={onOpenCall}
              className="w-10 h-10 rounded-2xl bg-card border border-border/50 shadow-sm flex items-center justify-center active:scale-90 transition-transform hover:bg-accent/40 text-foreground"
              title="Doctor Consultation Call"
            >
              <Phone className="w-4.5 h-4.5 text-primary" />
            </button>
          )}

          <button
            type="button"
            onClick={() => navigate("/rewards")}
            className="w-10 h-10 rounded-2xl bg-card border border-border/50 shadow-sm flex items-center justify-center active:scale-90 transition-transform hover:bg-accent/40 text-foreground"
            title="Rewards & Wallet"
          >
            <Wallet className="w-4.5 h-4.5 text-amber-500" />
          </button>

          <button
            type="button"
            onClick={() => navigate("/notifications")}
            className="w-10 h-10 rounded-2xl bg-card border border-border/50 shadow-sm flex items-center justify-center relative active:scale-90 transition-transform hover:bg-accent/40 text-foreground"
            title="Notifications"
          >
            <Bell className="w-4.5 h-4.5 text-foreground" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-primary rounded-full flex items-center justify-center text-[10px] font-black text-white ring-2 ring-background shadow-sm">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => navigate("/profile")}
            className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary/20 via-sky-500/20 to-indigo-500/20 border border-primary/30 flex items-center justify-center active:scale-90 transition-transform shrink-0"
            title="User Profile"
          >
            <User className="w-5 h-5 text-primary" />
          </button>
        </div>
      </div>

      {/* Sub-header Banner: Live Express Status / Greeting Pill */}
      <div className="flex items-center justify-between gap-2 px-0.5 pt-0.5">
        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar">
          <div className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full text-emerald-600 dark:text-emerald-400 shrink-0">
            <Zap className="w-3.5 h-3.5 fill-emerald-500 text-emerald-500" />
            <span className="text-[11px] font-bold tracking-tight">Express 15-min Home Sample Collection</span>
          </div>

          {activeBookingsCount > 0 && (
            <div className="flex items-center gap-1 bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-full text-primary shrink-0">
              <Sparkles className="w-3.5 h-3.5" />
              <span className="text-[11px] font-black">{activeBookingsCount} Active Bookings</span>
            </div>
          )}
        </div>
      </div>

      {/* Zomato Style Location Picker Modal */}
      <AnimatePresence>
        {showLocationModal && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-md bg-card rounded-t-3xl sm:rounded-3xl p-6 border border-border shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-foreground">Select Delivery Location</h3>
                  <p className="text-xs text-muted-foreground">Select sample pickup address for home collection</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLocationModal(false)}
                  className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-bold hover:bg-accent"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-2">
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
                      className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                        isCurrent
                          ? "border-primary bg-primary/10 shadow-sm"
                          : "border-border/60 hover:bg-muted/40"
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <MapPin className={`w-5 h-5 mt-0.5 shrink-0 ${isCurrent ? "text-primary" : "text-muted-foreground"}`} />
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-foreground">{loc.title}</h4>
                          <p className="text-xs text-muted-foreground leading-tight mt-0.5 truncate">{loc.addr}</p>
                        </div>
                      </div>
                      {isCurrent && <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />}
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
                className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/25 active:scale-[0.98] transition-transform"
              >
                <Crosshair className="w-4 h-4" />
                Add New Address
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
