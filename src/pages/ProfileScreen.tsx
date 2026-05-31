import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import {
  User,
  ChevronRight,
  MapPin,
  Crown,
  HelpCircle,
  LogOut,
  Moon,
  Bell,
  Users,
  FileText,
  Wallet,
  Sparkles,
  ArrowDownLeft,
  ArrowUpRight,
  History,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import MobileLayout from "@/components/layout/MobileLayout";
import ScreenHeader from "@/components/layout/ScreenHeader";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSEO } from "@/hooks/useSEO";
import { useFamilyMembers } from "@/hooks/useFamilyMembers";

const menuItems: { icon: any; label: string; path: string; badge?: string | null }[] = [
  { icon: MapPin, label: "Saved Addresses", path: "/saved-addresses", badge: null },
  { icon: Users, label: "Family Members", path: "/family-members", badge: null },
  { icon: Crown, label: "Subscription Plans", path: "/subscription", badge: null },
  { icon: HelpCircle, label: "Help & Support", path: "/support", badge: null },
  { icon: FileText, label: "Terms & Conditions", path: "/terms", badge: null },
];

const ProfileScreen = () => {
  useSEO({ title: "My Profile | BloodLyn", description: "Manage your BloodLyn profile, addresses, family members and account settings." });
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { membershipType, isActive } = useSubscription();
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(user?.user_metadata?.avatar_url || null);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [profileContact, setProfileContact] = useState<string | null>(null);
  const { members: familyMembers } = useFamilyMembers();
  const [addressCount, setAddressCount] = useState(0);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [walletTxns, setWalletTxns] = useState<Array<{ id: string; amount: number; type: string; description: string | null; created_at: string; balance_after: number }>>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const loadProfileData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("avatar_url, full_name, phone, email, wallet_balance")
          .eq("id", session.user.id)
          .maybeSingle();
        if (profileData?.avatar_url) {
          setProfileImageUrl(profileData.avatar_url);
        }
        if (profileData?.full_name) {
          setProfileName(profileData.full_name);
        }
        if (profileData?.phone || profileData?.email) {
          setProfileContact(profileData.phone || profileData.email || null);
        }
        setWalletBalance(Number((profileData as any)?.wallet_balance ?? 0));

        const { count } = await supabase
          .from("addresses")
          .select("id", { count: "exact", head: true })
          .eq("user_id", session.user.id);
        setAddressCount(count ?? 0);

        const { data: txns } = await supabase
          .from("wallet_transactions")
          .select("id, amount, type, description, created_at, balance_after")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false })
          .limit(20);
        setWalletTxns((txns as any[]) || []);
      }
    };
    loadProfileData();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success("Logged out successfully");
      navigate("/login", { replace: true });
    } catch (error) {
      toast.error("Failed to log out");
    }
  };

  const displayName = profileName || user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split("@")[0] || "User";
  const contactInfo = profileContact || user?.phone || user?.email || "";

  return (
    <MobileLayout className="relative min-h-screen overflow-x-hidden">
      {/* Aurora Ambient Layers */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="home-aurora h-full w-full">
          <div className="aurora-blob aurora-blob-1 opacity-[0.4] dark:opacity-[0.25]" />
          <div className="aurora-blob aurora-blob-2 opacity-[0.35] dark:opacity-[0.2]" />
          <div className="aurora-grid opacity-[0.15] dark:opacity-[0.1]" />
        </div>
      </div>

      <ScreenHeader
        title="Profile"
        showBack={false}
        transparent
        className={scrolled ? "bg-background/80 backdrop-blur-xl border-b border-border/50 transition-all duration-300" : "bg-transparent border-transparent transition-all duration-300"}
      />

      <div className="px-4 pb-12 relative z-10">
        {/* Profile Hero Section */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-6 flex flex-col items-center text-center"
        >
          <div className="relative group">
            <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-150 opacity-50 group-hover:opacity-80 transition-opacity" />
            <motion.div
              whileTap={{ scale: 0.95 }}
              className="relative w-28 h-28 rounded-[2.5rem] p-1 bg-gradient-to-tr from-primary via-primary/40 to-success/40 shadow-2xl"
            >
              <div className="w-full h-full rounded-[2.3rem] overflow-hidden bg-card ring-4 ring-background">
                {profileImageUrl || user?.user_metadata?.avatar_url ? (
                  <img
                    src={profileImageUrl || user?.user_metadata?.avatar_url}
                    alt={displayName}
                    className="w-full h-full object-cover"
                    loading="lazy" decoding="async"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <User className="w-12 h-12 text-primary" />
                  </div>
                )}
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="absolute -bottom-2 -right-2 w-10 h-10 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg ring-4 ring-background cursor-pointer active:scale-90 transition-transform"
              onClick={() => navigate("/edit-profile")}
            >
              <Sparkles className="w-5 h-5" />
            </motion.div>
          </div>

          <div className="mt-6">
            <h2 className="text-2xl font-extrabold text-foreground tracking-tight">{displayName}</h2>
            <p className="text-sm text-muted-foreground font-medium mt-1">{contactInfo}</p>
            {isActive && membershipType && (
              <div className="flex items-center justify-center mt-3">
                <Badge className="bg-gradient-to-r from-primary/20 to-success/20 text-primary border-primary/20 backdrop-blur-md px-4 py-1.5 rounded-2xl flex items-center gap-2">
                  <Crown className="w-3.5 h-3.5" />
                  <span className="capitalize font-bold tracking-tight text-[11px]">{membershipType} Member</span>
                </Badge>
              </div>
            )}
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mt-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="quick-action p-4 flex flex-col items-center justify-center text-center bg-card/40 backdrop-blur-md border-white/10 cursor-pointer"
            onClick={() => navigate("/saved-addresses")}
          >
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
              <MapPin className="w-6 h-6 text-primary" />
            </div>
            <span className="text-2xl font-black text-foreground">{addressCount}</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">Addresses</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="quick-action p-4 flex flex-col items-center justify-center text-center bg-card/40 backdrop-blur-md border-white/10 cursor-pointer"
            onClick={() => navigate("/family-members")}
          >
            <div className="w-12 h-12 rounded-2xl bg-success/10 flex items-center justify-center mb-3">
              <Users className="w-6 h-6 text-success" />
            </div>
            <span className="text-2xl font-black text-foreground">{familyMembers.length}</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">Family</span>
          </motion.div>
        </div>

        {/* Wallet Section - Premium Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6 group"
        >
          <div className="relative overflow-hidden rounded-[2.5rem] p-6 bg-gradient-to-br from-secondary via-secondary to-secondary/80 text-white shadow-2xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-3xl rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-success/10 blur-3xl rounded-full translate-y-1/3 -translate-x-1/4 pointer-events-none" />

            <div className="relative flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">Current Balance</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-4xl font-black tabular-nums tracking-tighter">₹{walletBalance.toFixed(0)}</span>
                  <div className="px-2 py-0.5 rounded-lg bg-white/10 border border-white/10 backdrop-blur-md flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-primary" />
                    <span className="text-[9px] font-bold">CREDITS</span>
                  </div>
                </div>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center shadow-inner backdrop-blur-xl">
                <Wallet className="w-7 h-7 text-white" />
              </div>
            </div>

            <button
              onClick={() => setShowHistory((v) => !v)}
              className="relative mt-8 w-full flex items-center justify-between bg-white/5 hover:bg-white/10 active:scale-[0.98] transition-all rounded-2xl px-4 py-3.5 border border-white/5 backdrop-blur-md"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
                  <History className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-bold tracking-tight">Account Activity</span>
              </div>
              <ChevronRight className={`w-5 h-5 transition-transform duration-300 ${showHistory ? "rotate-90" : ""}`} />
            </button>
          </div>
        </motion.div>

        {/* Wallet History - Animated Drawer Feel */}
        <AnimatePresence>
          {showHistory && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -20 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0, y: -20 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="overflow-hidden"
            >
              <div className="soft-card mt-4 border border-border/40 bg-card/60 backdrop-blur-md p-5 rounded-[2rem]">
                <h3 className="font-bold text-foreground text-xs uppercase tracking-widest mb-4 px-1 flex items-center gap-2">
                  <History className="w-3.5 h-3.5 text-primary" />
                  Transaction Log
                </h3>
                {walletTxns.length === 0 ? (
                  <div className="py-8 text-center">
                    <div className="w-12 h-12 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Wallet className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-semibold text-muted-foreground">No recent activity</p>
                    <p className="text-[11px] text-muted-foreground/60 mt-1 uppercase tracking-widest">Refunds will appear here</p>
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {walletTxns.map((t) => {
                      const isCredit = t.type === "credit";
                      return (
                        <li key={t.id} className="flex items-center gap-4 p-3 rounded-2xl bg-background/40 border border-border/40">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isCredit ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                            {isCredit ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-foreground truncate">{t.description || (isCredit ? "Wallet credit" : "Wallet debit")}</p>
                            <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-tighter mt-0.5">
                              {new Date(t.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                              {" · "}Balance ₹{Number(t.balance_after).toFixed(0)}
                            </p>
                          </div>
                          <p className={`text-sm font-black tabular-nums ${isCredit ? "text-success" : "text-destructive"}`}>
                            {isCredit ? "+" : "−"}₹{Number(t.amount).toFixed(0)}
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Grid - Polished Menu */}
        <div className="mt-8">
          <h3 className="text-xs font-black uppercase tracking-[0.25em] text-muted-foreground/50 px-2 mb-4">Settings & Management</h3>
          <div className="grid grid-cols-1 gap-2.5">
            {menuItems.map((item, index) => (
              <motion.button
                key={item.label}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.05 }}
                onClick={() => navigate(item.path)}
                className="group relative w-full flex items-center gap-4 p-4 rounded-3xl bg-card/60 backdrop-blur-md border border-border/40 hover:bg-card hover:border-primary/20 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                  <item.icon className="w-5 h-5 text-foreground group-hover:text-primary transition-colors" />
                </div>
                <div className="flex-1 flex flex-col items-start">
                  <span className="font-bold text-foreground tracking-tight">{item.label}</span>
                  <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest mt-0.5">
                    {item.label === "Saved Addresses" ? `${addressCount} saved` :
                     item.label === "Family Members" ? `${familyMembers.length} linked` :
                     item.label === "Subscription Plans" ? (isActive ? "Premium Active" : "View Plans") :
                     "Configure"}
                  </span>
                </div>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                  <ChevronRight className="w-5 h-5" />
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Quick Settings - Elegant Toggles */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="mt-4 p-6 rounded-[2.5rem] bg-card/40 backdrop-blur-md border border-border/40 space-y-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl bg-secondary/10 flex items-center justify-center ring-1 ring-secondary/20">
                <Moon className="w-5 h-5 text-secondary" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-foreground tracking-tight">Dark Aesthetic</span>
                <span className="text-[10px] font-bold text-muted-foreground/60 uppercase">High contrast mode</span>
              </div>
            </div>
            <Switch
              checked={theme === "dark"}
              onCheckedChange={toggleTheme}
              className="data-[state=checked]:bg-primary shadow-sm"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center ring-1 ring-primary/20">
                <Bell className="w-5 h-5 text-primary" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-foreground tracking-tight">Smart Alerts</span>
                <span className="text-[10px] font-bold text-muted-foreground/60 uppercase">Real-time order tracking</span>
              </div>
            </div>
            <Switch defaultChecked className="data-[state=checked]:bg-primary shadow-sm" />
          </div>
        </motion.div>

        {/* Footer Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="mt-10 flex flex-col items-center gap-6"
        >
          <button
            onClick={handleLogout}
            className="group flex items-center gap-3 px-8 py-4 rounded-2xl bg-destructive/5 hover:bg-destructive/10 text-destructive transition-all active:scale-95 border border-destructive/10 cursor-pointer"
          >
            <LogOut className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            <span className="font-bold tracking-tight">Sign Out Safely</span>
          </button>

          <div className="text-center">
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-muted-foreground/30">
               BloodLyn Premium v2.1.0
            </p>
            <p className="text-[10px] font-bold text-muted-foreground/40 mt-1">
              Optimized for high-refresh displays
            </p>
          </div>
        </motion.div>
      </div>
    </MobileLayout>
  );
};

export default ProfileScreen;
