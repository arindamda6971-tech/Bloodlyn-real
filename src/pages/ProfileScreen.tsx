import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  User,
  ChevronRight,
  MapPin,
  HelpCircle,
  LogOut,
  Users,
  FileText,
  Wallet,
  Pencil,
  Heart,
  CalendarDays,
  ShieldCheck,
  Database,
  Plus,
} from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSEO } from "@/hooks/useSEO";
import { useFamilyMembers } from "@/hooks/useFamilyMembers";
import { isCompleteCollectionAddress } from "@/lib/service-pincode";
import { walletService } from "@/lib/walletService";
import { WalletSummary } from "@/types/wallet";
import { useFavoriteLabs } from "@/hooks/useFavoriteLabs";

const ProfileScreen = () => {
  useSEO({ title: "My Profile | BloodLyn", description: "Manage your BloodLyn profile." });
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  
  const [profileName, setProfileName] = useState<string | null>(null);
  const [profileContact, setProfileContact] = useState<string | null>(null);
  const { members: familyMembers } = useFamilyMembers();
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [walletSummary, setWalletSummary] = useState<WalletSummary>({ moneyAdded: 0, refunds: 0, spent: 0 });
  const [reportsCount, setReportsCount] = useState(0);
  const [bookingsCount, setBookingsCount] = useState(0);
  const { favoriteCount } = useFavoriteLabs();

  useEffect(() => {
    const loadProfileData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return;

      const { data: profileData } = await supabase
        .from("profiles")
        .select("avatar_url, full_name, phone, email")
        .eq("id", session.user.id)
        .maybeSingle();

      if (profileData) {
        if (profileData.full_name) setProfileName(profileData.full_name);
        setProfileContact(profileData.phone || profileData.email || null);
      }

      const { wallet, summary } = await walletService.getWallet(session.user.id);
      setWalletBalance(Number(wallet?.available_balance ?? 0));
      setWalletSummary(summary);

      setReportsCount(2);
      setBookingsCount(3);
    };
    loadProfileData();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.warn("Sign out request failed, clearing local session:", error);
    }
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch { /* ignore */ }
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith("sb-") || k.startsWith("location_checked_") || k.startsWith("bloodlyn_service_pincode_"))
        .forEach((k) => localStorage.removeItem(k));
    } catch { /* ignore */ }
    toast.success("Logged out successfully");
    navigate("/login", { replace: true });
  };

  const displayName = profileName || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
  const contactInfo = profileContact || user?.phone || user?.email || "";

  return (
    <MobileLayout className="bg-slate-50 min-h-screen">
      <div className="absolute top-0 left-0 w-full h-80 bg-gradient-to-b from-slate-200/50 to-slate-50 z-0" />
      
      <div className="relative z-10 px-4 pt-10 pb-4">
        
        {/* Profile Info Row */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-slate-500 text-sm font-medium mb-0.5">Hello,</p>
            <h1 className="text-2xl font-black text-slate-900 mb-1 tracking-tight">{displayName}</h1>
            {user?.email && <p className="text-xs text-slate-500 font-medium">{user.email}</p>}
            {contactInfo !== user?.email && <p className="text-xs text-slate-500 mt-0.5 font-medium">{contactInfo}</p>}
          </div>
          <button 
            onClick={() => navigate("/edit-profile")}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-slate-900 text-white font-medium text-xs active:scale-95 transition-transform shadow-md"
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit Profile
          </button>
        </div>

        {/* 4-Item Quick Stats Grid */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { icon: CalendarDays, count: bookingsCount, label: "Bookings", path: "/bookings", iconColor: "text-blue-500", iconBg: "bg-blue-50" },
            { icon: FileText, count: reportsCount, label: "Reports", path: "/reports", iconColor: "text-emerald-500", iconBg: "bg-emerald-50" },
            { icon: Users, count: familyMembers.length, label: "Family", path: "/family-members", iconColor: "text-orange-500", iconBg: "bg-orange-50" },
            { icon: Heart, count: favoriteCount, label: "Saved", path: "/saved-labs", iconColor: "text-rose-500", iconBg: "bg-rose-50" },
          ].map((item, idx) => (
            <button key={idx} onClick={() => navigate(item.path)} className="bg-white rounded-2xl p-3 flex flex-col items-center justify-center shadow-sm active:scale-95 transition-transform border border-slate-100">
              <div className={`w-10 h-10 rounded-full ${item.iconBg} flex items-center justify-center mb-2`}>
                <item.icon className={`w-4 h-4 ${item.iconColor}`} />
              </div>
              <span className="text-lg font-black text-slate-900 leading-tight">{item.count}</span>
              <span className="text-[9px] text-slate-500 text-center font-bold uppercase tracking-wider mt-0.5 leading-tight">{item.label}</span>
            </button>
          ))}
        </div>

        {/* Ultra-Professional Wallet Card (Compact) */}
        <div 
          onClick={() => navigate('/wallet')}
          className="rounded-3xl p-4 mb-5 relative overflow-hidden bg-gradient-to-b from-[#18191c] to-[#0a0a0c] border border-white/10 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)] cursor-pointer active:scale-[0.98] transition-transform"
        >
          {/* Subtle top edge highlight for glass effect */}
          <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
          
          {/* Subtle glowing orb in the background */}
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-primary/20 rounded-full blur-[60px] pointer-events-none mix-blend-screen" />
          <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-emerald-500/10 rounded-full blur-[60px] pointer-events-none mix-blend-screen" />
          
          <div className="relative z-10 mb-4 flex justify-between items-center">
            <div className="flex flex-col">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-2.5 flex items-center gap-2 opacity-90">
                <Wallet className="w-4 h-4 text-slate-300" strokeWidth={2} />
                BloodLyn Wallet
              </h3>
              <div className="flex flex-col gap-1">
                <span className="text-[32px] leading-[0.8] font-bold tracking-tight text-white drop-shadow-sm">₹{walletBalance.toFixed(2)}</span>
                <p className="text-xs text-slate-400 font-medium">Available Balance</p>
              </div>
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); navigate('/wallet/add'); }}
              className="bg-white hover:bg-slate-50 text-slate-900 rounded-full px-4 py-2 flex items-center justify-center transition-transform active:scale-95 shadow-md gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold">Add Money</span>
            </button>
          </div>
        </div>

        {/* Consolidated Menu List */}
        <div className="bg-white rounded-3xl shadow-sm overflow-hidden mb-6 border border-slate-100">
          {[
            { icon: User, title: "My Profile", subtitle: "View and edit your personal details", path: "/edit-profile", iconColor: "text-blue-500", iconBg: "bg-blue-50" },
            { icon: Users, title: "Family Members", subtitle: "Manage your family profiles", path: "/family-members", iconColor: "text-emerald-500", iconBg: "bg-emerald-50" },
            { icon: CalendarDays, title: "My Bookings", subtitle: "View, reschedule or cancel bookings", path: "/bookings", iconColor: "text-rose-500", iconBg: "bg-rose-50" },
            { icon: FileText, title: "My Reports", subtitle: "View your test reports", path: "/reports", iconColor: "text-purple-500", iconBg: "bg-purple-50" },
            { icon: MapPin, title: "Saved Addresses", subtitle: "Manage your delivery addresses", path: "/saved-addresses", iconColor: "text-orange-500", iconBg: "bg-orange-50" },
            { icon: Heart, title: "Saved Labs", subtitle: "View your favorite partner labs", path: "/saved-labs", iconColor: "text-rose-500", iconBg: "bg-rose-50" },
            { icon: HelpCircle, title: "Help & Support", subtitle: "Get help or contact us", path: "/support", iconColor: "text-teal-500", iconBg: "bg-teal-50" },
            { icon: ShieldCheck, title: "Privacy & Terms", subtitle: "Policies, terms & data settings", path: "/terms", iconColor: "text-blue-600", iconBg: "bg-blue-50" },
          ].map((item, idx, arr) => (
            <button
              key={item.title}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center p-4 hover:bg-slate-50 active:bg-slate-100 transition-colors ${idx !== arr.length - 1 ? 'border-b border-slate-50' : ''}`}
            >
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${item.iconBg} mr-4`}>
                <item.icon className={`w-4 h-4 ${item.iconColor}`} />
              </div>
              <div className="flex-1 text-left">
                <h4 className="text-sm font-bold text-slate-900">{item.title}</h4>
                <p className="text-[11px] text-slate-500 mt-0.5 font-medium">{item.subtitle}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
            </button>
          ))}
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full bg-red-50 py-4 rounded-2xl flex items-center justify-center gap-2 text-red-600 font-bold text-sm active:scale-[0.98] transition-transform mb-8 shadow-md"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>

        {/* Footer */}
        <div className="text-center pb-2">
          <p className="text-[11px] text-slate-400 font-bold tracking-widest uppercase">BloodLyn v2.2.0</p>
          <p className="text-[10px] text-slate-400 mt-1 font-medium">Care Today For A Healthier Tomorrow</p>
        </div>

      </div>
    </MobileLayout>
  );
};

export default ProfileScreen;
