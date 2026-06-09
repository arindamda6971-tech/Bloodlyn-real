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
import ScreenHeader from "@/components/layout/ScreenHeader";
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
      {StaticBackground}

      <ScreenHeader title="Profile" showBack={false} />

      <div className="px-4 pb-12 relative z-10 overflow-hidden">
        {/* Profile Hero */}
        <div className="mt-6 flex flex-col items-center text-center">
          <div className="relative">
            <div className="w-28 h-28 rounded-[2.5rem] p-1 bg-gradient-to-tr from-primary to-success/40 shadow-xl overflow-hidden">
              <div className="w-full h-full rounded-[2.3rem] overflow-hidden bg-card">
                {profileImageUrl || user?.user_metadata?.avatar_url ? (
                  <img
                    src={profileImageUrl || user?.user_metadata?.avatar_url}
                    alt={displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-muted">
                    <User className="w-12 h-12 text-primary/40" />
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => navigate("/edit-profile")}
              className="absolute -bottom-1 -right-1 w-10 h-10 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg border-4 border-background active:scale-90 transition-transform"
            >
              <Pencil className="w-5 h-5" />
            </button>
          </div>

          <div className="mt-4">
            <h2 className="text-2xl font-extrabold text-foreground tracking-tight">{displayName}</h2>
            <p className="text-sm text-muted-foreground font-medium">{contactInfo}</p>

            <div className="flex items-center justify-center mt-3">
              {isActive ? (
                <div className="px-5 py-2 rounded-full bg-gradient-to-r from-[#FFD700] via-[#FDB931] to-[#8A6424] text-white flex items-center gap-2 shadow-md">
                  <Crown className="w-3.5 h-3.5 fill-white" />
                  <span className="font-black tracking-[0.05em] text-[11px] uppercase">Gold Member</span>
                </div>
              ) : (
                <div className="px-5 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  <span className="font-bold tracking-tight text-[11px] uppercase">Plus Member</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mt-8">
          <button
            className="p-4 rounded-3xl bg-card border border-border/50 flex flex-col items-center justify-center text-center active:scale-95 transition-transform"
            onClick={() => navigate("/saved-addresses")}
          >
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-2">
              <MapPin className="w-6 h-6 text-primary" />
            </div>
            <span className="text-xl font-black text-foreground">{addressCount}</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Addresses</span>
          </button>

          <button
            className="p-4 rounded-3xl bg-card border border-border/50 flex flex-col items-center justify-center text-center active:scale-95 transition-transform"
            onClick={() => navigate("/family-members")}
          >
            <div className="w-12 h-12 rounded-2xl bg-success/10 flex items-center justify-center mb-2">
              <Users className="w-6 h-6 text-success" />
            </div>
            <span className="text-xl font-black text-foreground">{familyMembers.length}</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Family</span>
          </button>
        </div>

        {/* Wallet */}
        <div className="mt-6">
          <div className="relative overflow-hidden rounded-[2.5rem] p-6 bg-[#0f172a] text-white shadow-2xl">
            <div className="relative flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">Balance</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-4xl font-black tabular-nums">₹{walletBalance.toFixed(0)}</span>
                  <Badge className="bg-primary/20 text-primary border-none text-[9px] font-bold">CREDITS</Badge>
                </div>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center shadow-inner">
                <Wallet className="w-7 h-7 text-white" />
              </div>
            </div>

            <button
              onClick={() => setShowHistory(!showHistory)}
              className="mt-6 w-full flex items-center justify-between bg-white/5 hover:bg-white/10 active:scale-[0.98] transition-all rounded-2xl px-4 py-3 border border-white/5"
            >
              <span className="text-sm font-bold tracking-tight">Account Activity</span>
              <ChevronRight className={`w-5 h-5 transition-transform duration-300 ${showHistory ? "rotate-90" : ""}`} />
            </button>
          </div>
        </div>

        {/* History */}
        <AnimatePresence>
          {showHistory && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-4 p-4 rounded-[2rem] bg-card border border-border/50">
                <ul className="space-y-3">
                  {walletTxns.map((t) => (
                    <li key={t.id} className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${t.type === "credit" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                        {t.type === "credit" ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">{t.description || "Transaction"}</p>
                        <p className="text-[10px] text-muted-foreground uppercase">{new Date(t.created_at).toLocaleDateString()}</p>
                      </div>
                      <p className={`text-sm font-black ${t.type === "credit" ? "text-success" : "text-destructive"}`}>
                        {t.type === "credit" ? "+" : "−"}₹{Number(t.amount).toFixed(0)}
                      </p>
                    </li>
                  ))}
                  {walletTxns.length === 0 && <p className="text-center text-xs text-muted-foreground py-4">No recent activity</p>}
                </ul>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Menu */}
        <div className="mt-8 space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className="w-full flex items-center gap-4 p-4 rounded-3xl bg-card border border-border/50 active:bg-muted transition-colors"
            >
              <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
                <item.icon className="w-5 h-5 text-foreground" />
              </div>
              <span className="flex-1 text-left font-bold text-foreground tracking-tight">{item.label}</span>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          ))}
        </div>

        {/* Toggles */}
        <div className="mt-4 p-6 rounded-[2.5rem] bg-card border border-border/50 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl bg-secondary/10 flex items-center justify-center">
                <Moon className="w-5 h-5 text-secondary" />
              </div>
              <span className="font-bold text-foreground tracking-tight">Dark Aesthetic</span>
            </div>
            <Switch checked={theme === "dark"} onCheckedChange={toggleTheme} />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Bell className="w-5 h-5 text-primary" />
              </div>
              <span className="font-bold text-foreground tracking-tight">Smart Alerts</span>
            </div>
            <Switch checked={smartAlertsEnabled} onCheckedChange={setSmartAlertsEnabled} />
          </div>
        </div>

        {/* Sign Out */}
        <div className="mt-10 flex flex-col items-center gap-6">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-10 py-4 rounded-2xl bg-destructive/5 text-destructive border border-destructive/10 active:scale-95 transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-bold">Sign Out</span>
          </button>
          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-muted-foreground/30">
             BloodLyn Premium v2.2.0
          </p>
        </div>
      </div>
    </MobileLayout>
  );
};

export default ProfileScreen;
