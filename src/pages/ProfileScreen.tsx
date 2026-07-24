import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useMemo } from "react";
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
  Pencil,
  ArrowDownLeft,
  ArrowUpRight,
  History,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import MobileLayout from "@/components/layout/MobileLayout";
import PremiumPageHeader from "@/components/layout/PremiumPageHeader";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSEO } from "@/hooks/useSEO";
import { useFamilyMembers } from "@/hooks/useFamilyMembers";
import { useNotifications } from "@/contexts/NotificationContext";

const menuItems = [
  { icon: MapPin, label: "Saved Addresses", path: "/saved-addresses" },
  { icon: Users, label: "Family Members", path: "/family-members" },
  { icon: Crown, label: "Subscription Plans", path: "/subscription" },
  { icon: HelpCircle, label: "Help & Support", path: "/support" },
  { icon: FileText, label: "Terms & Conditions", path: "/terms" },
];

const ProfileScreen = () => {
  useSEO({ title: "My Profile | BloodLyn", description: "Manage your BloodLyn profile." });
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { membershipType, isActive } = useSubscription();
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(user?.user_metadata?.avatar_url || null);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [profileContact, setProfileContact] = useState<string | null>(null);
  const { members: familyMembers } = useFamilyMembers();
  const { smartAlertsEnabled, setSmartAlertsEnabled } = useNotifications();
  const [addressCount, setAddressCount] = useState(0);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [walletTxns, setWalletTxns] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    const loadProfileData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return;

      const { data: profileData } = await supabase
        .from("profiles")
        .select("avatar_url, full_name, phone, email, wallet_balance")
        .eq("id", session.user.id)
        .maybeSingle();

      if (profileData) {
        if (profileData.avatar_url) setProfileImageUrl(profileData.avatar_url);
        if (profileData.full_name) setProfileName(profileData.full_name);
        setProfileContact(profileData.phone || profileData.email || null);
        setWalletBalance(Number(profileData.wallet_balance ?? 0));
      }

      const { count } = await supabase
        .from("addresses")
        .select("id", { count: "exact", head: true })
        .eq("user_id", session.user.id);
      setAddressCount(count ?? 0);

      const { data: txns } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(5); // Ultra minimal for speed
      setWalletTxns(txns || []);
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

  const displayName = profileName || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
  const contactInfo = profileContact || user?.phone || user?.email || "";

  // Performance: Use static background instead of heavy blur filters
  const StaticBackground = useMemo(() => (
    <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-primary/10 to-transparent" />
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px]" />
    </div>
  ), []);

  return (
    <MobileLayout className="bg-background">
      <div
        className="sticky top-0 z-40 bg-background"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px))" }}
      >
        <div className="px-5 pt-3 pb-3">
          <PremiumPageHeader
            title="My Profile"
            subtitle="Account · preferences · rewards"
            icon={User}
          />
        </div>
      </div>

      <div className="px-4 pb-16 relative z-10">
        {/* Profile Hero Header */}
        <div className="mt-4 p-6 rounded-[2.2rem] bg-card border border-border/60 shadow-sm flex flex-col items-center text-center relative overflow-hidden">
          {/* Top subtle glow bar */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary via-indigo-500 to-emerald-500" />
          
          <div className="relative mt-2">
            <div className="w-24 h-24 rounded-[2rem] p-1 bg-gradient-to-br from-primary/30 to-indigo-500/20 border border-primary/20 shadow-md overflow-hidden">
              <div className="w-full h-full rounded-[1.8rem] overflow-hidden bg-muted">
                {profileImageUrl || user?.user_metadata?.avatar_url ? (
                  <img
                    src={profileImageUrl || user?.user_metadata?.avatar_url}
                    alt={displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-primary/10">
                    <User className="w-10 h-10 text-primary" />
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => navigate("/edit-profile")}
              className="absolute -bottom-1 -right-1 w-8.5 h-8.5 rounded-xl bg-primary text-white flex items-center justify-center shadow-md border-2 border-card active:scale-90 transition-transform"
              title="Edit Profile"
            >
              <Pencil className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-3.5">
            <h2 className="text-xl font-black text-foreground tracking-tight">{displayName}</h2>
            <p className="text-xs text-muted-foreground font-semibold mt-0.5">{contactInfo}</p>

            <div className="flex items-center justify-center mt-3">
              {isActive ? (
                <div className="px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-600 text-white flex items-center gap-1.5 shadow-xs">
                  <Crown className="w-3.5 h-3.5 fill-white" />
                  <span className="font-extrabold tracking-wider text-[10px] uppercase">Gold Member</span>
                </div>
              ) : (
                <div className="px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  <span className="font-extrabold tracking-wider text-[10px] uppercase">Plus Member</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <button
            className="p-4 rounded-3xl bg-card border border-border/60 flex flex-col items-center justify-center text-center active:scale-[0.98] transition-transform shadow-2xs hover:border-primary/40"
            onClick={() => navigate("/saved-addresses")}
          >
            <div className="w-10 h-10 rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center mb-2">
              <MapPin className="w-5 h-5" />
            </div>
            <span className="text-lg font-black text-foreground">{addressCount}</span>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground mt-0.5">Saved Addresses</span>
          </button>

          <button
            className="p-4 rounded-3xl bg-card border border-border/60 flex flex-col items-center justify-center text-center active:scale-[0.98] transition-transform shadow-2xs hover:border-emerald-500/40"
            onClick={() => navigate("/family-members")}
          >
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-lg font-black text-foreground">{familyMembers.length}</span>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground mt-0.5">Family Members</span>
          </button>
        </div>

        {/* Executive Wallet Card */}
        <div className="mt-4">
          <div className="relative overflow-hidden rounded-[2.2rem] p-5 bg-slate-950 dark:bg-slate-900 text-white shadow-xl border border-slate-800">
            <div className="relative flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-400">Health Wallet</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-black tabular-nums tracking-tight">₹{walletBalance.toFixed(0)}</span>
                  <Badge className="bg-primary/20 text-primary border border-primary/30 text-[9px] font-extrabold px-2 py-0.5">CREDITS</Badge>
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center shadow-inner">
                <Wallet className="w-6 h-6 text-white" />
              </div>
            </div>

            <button
              onClick={() => setShowHistory(!showHistory)}
              className="mt-4 w-full flex items-center justify-between bg-white/5 hover:bg-white/10 active:scale-[0.98] transition-all rounded-xl px-3.5 py-2.5 border border-white/10"
            >
              <span className="text-xs font-bold tracking-tight text-slate-200">Account Activity</span>
              <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${showHistory ? "rotate-90" : ""}`} />
            </button>
          </div>
        </div>

        {/* History Expandable Panel */}
        <AnimatePresence>
          {showHistory && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-3 p-4 rounded-3xl bg-card border border-border/60 shadow-2xs">
                <ul className="space-y-3">
                  {walletTxns.map((t) => (
                    <li key={t.id} className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${t.type === "credit" ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"}`}>
                        {t.type === "credit" ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">{t.description || "Transaction"}</p>
                        <p className="text-[10px] text-muted-foreground font-medium uppercase">{new Date(t.created_at).toLocaleDateString()}</p>
                      </div>
                      <p className={`text-xs font-black ${t.type === "credit" ? "text-emerald-600" : "text-rose-600"}`}>
                        {t.type === "credit" ? "+" : "−"}₹{Number(t.amount).toFixed(0)}
                      </p>
                    </li>
                  ))}
                  {walletTxns.length === 0 && <p className="text-center text-xs text-muted-foreground py-3">No recent activity</p>}
                </ul>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Grouped Account Menu */}
        <div className="mt-6 space-y-3">
          <p className="px-2 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/70">
            Account & Support
          </p>

          <div className="space-y-2">
            {[
              { icon: MapPin, label: "Saved Addresses", path: "/saved-addresses", color: "bg-sky-500/10 text-sky-600" },
              { icon: Users, label: "Family Members", path: "/family-members", color: "bg-emerald-500/10 text-emerald-600" },
              { icon: Crown, label: "Subscription Plans", path: "/subscription", color: "bg-amber-500/10 text-amber-600" },
              { icon: HelpCircle, label: "Help & Support", path: "/support", color: "bg-purple-500/10 text-purple-600" },
              { icon: FileText, label: "Terms & Conditions", path: "/terms", color: "bg-slate-500/10 text-slate-600" },
            ].map((item) => (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl bg-card border border-border/60 hover:bg-accent/40 active:scale-[0.99] transition-all shadow-2xs group"
              >
                <div className={`w-10 h-10 rounded-xl ${item.color} flex items-center justify-center shrink-0`}>
                  <item.icon className="w-4.5 h-4.5" />
                </div>
                <span className="flex-1 text-left text-xs font-bold text-foreground tracking-tight">{item.label}</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground/60 group-hover:text-primary transition-colors" />
              </button>
            ))}
          </div>
        </div>

        {/* App Preferences */}
        <div className="mt-6 space-y-3">
          <p className="px-2 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/70">
            Preferences & Settings
          </p>

          <div className="p-4 rounded-3xl bg-card border border-border/60 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9.5 h-9.5 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0">
                  <Moon className="w-4.5 h-4.5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">Dark Aesthetic</p>
                  <p className="text-[10px] text-muted-foreground font-medium">Switch to dark mode interface</p>
                </div>
              </div>
              <Switch checked={theme === "dark"} onCheckedChange={toggleTheme} />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-border/50">
              <div className="flex items-center gap-3">
                <div className="w-9.5 h-9.5 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Bell className="w-4.5 h-4.5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">Smart Alerts</p>
                  <p className="text-[10px] text-muted-foreground font-medium">Receive test status & booking updates</p>
                </div>
              </div>
              <Switch checked={smartAlertsEnabled} onCheckedChange={setSmartAlertsEnabled} />
            </div>
          </div>
        </div>

        {/* Sign Out & Version */}
        <div className="mt-8 flex flex-col items-center gap-4">
          <button
            onClick={handleLogout}
            className="w-full py-3.5 rounded-2xl bg-rose-500/10 text-rose-600 border border-rose-500/20 font-extrabold text-xs flex items-center justify-center gap-2 active:scale-[0.98] transition-all hover:bg-rose-500/15"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out Account</span>
          </button>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground/40">
            BloodLyn Professional v2.2.0
          </p>
        </div>
      </div>
    </MobileLayout>
  );
};

export default ProfileScreen;
