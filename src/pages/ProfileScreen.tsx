import { useNavigate } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
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
  History,
  ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import MobileLayout from "@/components/layout/MobileLayout";
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
  const { members: familyMembers } = useFamilyMembers();

  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(user?.user_metadata?.avatar_url || null);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [profileContact, setProfileContact] = useState<string | null>(null);
  const [addressCount, setAddressCount] = useState(0);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [showHistory, setShowHistory] = useState(false);

  // Header Squeeze Logic
  const { scrollY } = useScroll();
  const headerHeight = useTransform(scrollY, [0, 80], [130, 70]);
  const titleOpacity = useTransform(scrollY, [0, 40], [1, 0]);
  const titleScale = useTransform(scrollY, [0, 40], [1, 0.8]);

  useEffect(() => {
    const loadProfileData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("avatar_url, full_name, phone, email, wallet_balance")
          .eq("id", session.user.id)
          .maybeSingle();
        if (profileData) {
          if (profileData.avatar_url) setProfileImageUrl(profileData.avatar_url);
          if (profileData.full_name) setProfileName(profileData.full_name);
          if (profileData.phone || profileData.email) setProfileContact(profileData.phone || profileData.email || null);
          setWalletBalance(Number((profileData as any)?.wallet_balance ?? 0));
        }

        const { count } = await supabase
          .from("addresses")
          .select("id", { count: "exact", head: true })
          .eq("user_id", session.user.id);
        setAddressCount(count ?? 0);
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
    <MobileLayout>
      <motion.header
        className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40 px-6 overflow-hidden flex items-center justify-between"
        style={{ height: headerHeight, paddingTop: "calc(env(safe-area-inset-top, 24px) + 12px)" }}
      >
        <motion.h1 style={{ opacity: titleOpacity, scale: titleScale, originX: 0 }} className="text-[24px] font-black text-foreground tracking-tight">My Profile</motion.h1>
        <button onClick={handleLogout} className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center border border-destructive/10 active:scale-90 transition-transform">
          <LogOut className="w-5 h-5 text-destructive" />
        </button>
      </motion.header>

<<<<<<< HEAD
      <div className="px-4 pb-6">
        {/* Profile card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="soft-card mt-4 flex items-center gap-4"
        >
          {profileImageUrl ? (
            <img 
              src={profileImageUrl} 
              alt={displayName}
              className="w-16 h-16 rounded-2xl object-cover"
             loading="lazy" decoding="async" />
          ) : user?.user_metadata?.avatar_url ? (
            <img 
              src={user.user_metadata.avatar_url} 
              alt={displayName}
              className="w-16 h-16 rounded-2xl object-cover"
             loading="lazy" decoding="async" />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
              <User className="w-8 h-8 text-primary-foreground" />
            </div>
          )}
          <div className="flex-1">
            <h2 className="text-lg font-bold text-foreground">{displayName}</h2>
            <p className="text-sm text-muted-foreground">{contactInfo}</p>
            {isActive && membershipType && (
              <Badge variant="soft" className="mt-1 capitalize">
                {membershipType} Member
              </Badge>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate("/edit-profile")}>
            Edit
          </Button>
        </motion.div>

        {/* Quick Stats Row */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-3 grid grid-cols-3 gap-2"
        >
          {[
            { label: "Family", value: String(familyMembers.length), onClick: () => navigate("/family-members") },
            { label: "Addresses", value: String(addressCount), onClick: () => navigate("/saved-addresses") },
            { label: "Orders", value: "View", onClick: () => navigate("/bookings") },
          ].map((s) => (
            <button
              key={s.label}
              onClick={s.onClick}
              className="rounded-2xl bg-muted/60 hover:bg-muted active:scale-[0.97] transition-all border border-border/60 p-3 text-center"
            >
              <p className="text-lg font-bold text-foreground leading-none">{s.value}</p>
              <p className="text-[11px] text-muted-foreground mt-1">{s.label}</p>
            </button>
          ))}
        </motion.div>


        {/* Wallet card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mt-4 relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-primary via-primary/90 to-success text-primary-foreground shadow-lg"
        >
          <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-white/10" />
          <div className="absolute -right-12 -bottom-10 w-40 h-40 rounded-full bg-white/5" />
          <div className="relative flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-white/80 text-xs font-medium uppercase tracking-wider">
                <Wallet className="w-4 h-4" />
                BloodLyn Wallet
              </div>
              <p className="text-3xl font-extrabold mt-2 text-white drop-shadow-sm">₹{walletBalance.toFixed(0)}</p>
              <p className="text-xs text-white/85 mt-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Use credits on your next order
              </p>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Wallet className="w-7 h-7 text-white" />
            </div>
          </div>
          {/* History toggle */}
          <button
            onClick={() => setShowHistory((v) => !v)}
            className="relative mt-4 w-full flex items-center justify-between bg-white/15 hover:bg-white/20 active:scale-[0.99] transition-all rounded-xl px-3 py-2 text-white"
            aria-expanded={showHistory}
          >
            <span className="flex items-center gap-2 text-xs font-semibold">
              <History className="w-4 h-4" />
              {showHistory ? "Hide wallet history" : "View wallet history"}
            </span>
            <ChevronRight className={`w-4 h-4 transition-transform ${showHistory ? "rotate-90" : ""}`} />
          </button>
        </motion.div>

        {/* Wallet History */}
        {showHistory && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="soft-card mt-3"
          >
            <h3 className="font-semibold text-foreground text-sm mb-3 flex items-center gap-2">
              <History className="w-4 h-4 text-primary" />
              Wallet History
            </h3>
            {walletTxns.length === 0 ? (
              <div className="py-6 text-center">
                <Wallet className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No wallet transactions yet</p>
                <p className="text-xs text-muted-foreground mt-0.5">Refunds and credits will appear here</p>
              </div>
=======
      <div className="px-6 pb-24">
        {/* Profile Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="soft-card mt-6 border border-white/50 bg-white/60 backdrop-blur-md flex flex-col items-center text-center p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl" />
          <div className="relative">
            {profileImageUrl ? (
              <img src={profileImageUrl} className="w-24 h-24 rounded-[2rem] object-cover shadow-2xl border-4 border-white" />
>>>>>>> d623537 (feat: Comprehensive Futuristic UI overhaul and Squeezable Header system)
            ) : (
              <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-2xl border-4 border-white">
                <User className="w-10 h-10 text-white" />
              </div>
            )}
            <button onClick={() => navigate("/edit-profile")} className="absolute -bottom-2 -right-2 w-10 h-10 rounded-xl bg-white shadow-lg flex items-center justify-center border border-border/50 active:scale-90 transition-transform">
              <Sparkles className="w-5 h-5 text-primary" />
            </button>
          </div>
          <div className="mt-4">
            <h2 className="text-xl font-black text-foreground">{displayName}</h2>
            <p className="text-sm font-bold text-muted-foreground opacity-60 tracking-tight">{contactInfo}</p>
          </div>
        </motion.div>

        {/* Wallet Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mt-4 soft-card p-6 bg-black text-white relative overflow-hidden group active:scale-[0.98] transition-transform">
          <div className="absolute top-0 right-0 w-40 h-40 bg-primary/20 rounded-full -mr-20 -mt-20 blur-[80px]" />
          <div className="relative flex justify-between items-center">
            <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-1">Available Credits</p><h3 className="text-3xl font-black tracking-tighter">₹{walletBalance.toFixed(0)}</h3></div>
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10"><Wallet className="w-6 h-6 text-white" /></div>
          </div>
        </motion.div>

        {/* Settings */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="soft-card mt-6 space-y-4 border border-white/40 bg-white/40 backdrop-blur-sm p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3"><div className="w-12 h-12 rounded-[1.2rem] bg-secondary/10 flex items-center justify-center"><Moon className="w-6 h-6 text-secondary" /></div><span className="font-bold text-foreground">Dark Mode</span></div>
            <Switch checked={theme === "dark"} onCheckedChange={toggleTheme} />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3"><div className="w-12 h-12 rounded-[1.2rem] bg-primary/10 flex items-center justify-center"><Bell className="w-6 h-6 text-primary" /></div><span className="font-bold text-foreground">Notifications</span></div>
            <Switch defaultChecked />
          </div>
        </motion.div>

        {/* Menu */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mt-6 space-y-3">
          {menuItems.map((item, index) => (
            <motion.button key={item.label} whileTap={{ scale: 0.97 }} onClick={() => navigate(item.path)} className="w-full soft-card flex items-center gap-4 border border-white/40 bg-white/50 backdrop-blur-sm p-4">
              <div className="w-12 h-12 rounded-[1.2rem] bg-background shadow-inner flex items-center justify-center border border-white"><item.icon className="w-6 h-6 text-foreground/80" /></div>
              <span className="flex-1 text-left font-black text-foreground tracking-tight text-[15px]">{item.label}</span>
              <ChevronRight className="w-5 h-5 text-muted-foreground opacity-50" />
            </motion.button>
          ))}
        </motion.div>

        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 mt-10">BloodLyn v2.1.0 • Built for Performance</motion.p>
      </div>
    </MobileLayout>
  );
};

export default ProfileScreen;
