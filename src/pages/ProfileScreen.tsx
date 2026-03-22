import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import MobileLayout from "@/components/layout/MobileLayout";
import ScreenHeader from "@/components/layout/ScreenHeader";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
// Address count fetched directly from Supabase in useEffect
import { useFamilyMembers } from "@/hooks/useFamilyMembers";


const menuItems: { icon: any; label: string; path: string; badge?: string | null }[] = [
  { icon: MapPin, label: "Saved Addresses", path: "/saved-addresses", badge: null },
  { icon: Users, label: "Family Members", path: "/family-members", badge: null },
  { icon: Crown, label: "Subscription Plans", path: "/subscription", badge: null },
  { icon: HelpCircle, label: "Help & Support", path: "/support", badge: null },
];

const ProfileScreen = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { membershipType, isActive } = useSubscription();
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(user?.user_metadata?.avatar_url || null);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [profileContact, setProfileContact] = useState<string | null>(null);
  const { members: familyMembers } = useFamilyMembers();
  const [addressCount, setAddressCount] = useState(0);

  useEffect(() => {
    const loadProfileData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        // Load full profile from DB (name, avatar, phone/email)
        const { data: profileData } = await supabase
          .from("profiles")
          .select("avatar_url, full_name, phone, email")
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

        // Load address count directly from Supabase
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
      <ScreenHeader title="Profile" showBack={false} />

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
            />
          ) : user?.user_metadata?.avatar_url ? (
            <img 
              src={user.user_metadata.avatar_url} 
              alt={displayName}
              className="w-16 h-16 rounded-2xl object-cover"
            />
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

        {/* Quick settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="soft-card mt-4 space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center">
                <Moon className="w-5 h-5 text-secondary" />
              </div>
              <span className="font-medium text-foreground">Dark Mode</span>
            </div>
            <Switch checked={theme === "dark"} onCheckedChange={toggleTheme} />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Bell className="w-5 h-5 text-primary" />
              </div>
              <span className="font-medium text-foreground">Notifications</span>
            </div>
            <Switch defaultChecked />
          </div>
        </motion.div>

        {/* Menu items */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-4 space-y-2"
        >
          {menuItems.map((item, index) => (
            <motion.button
              key={item.label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + index * 0.05 }}
              onClick={() => navigate(item.path)}
              className="w-full soft-card flex items-center gap-4"
            >
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                <item.icon className="w-5 h-5 text-foreground" />
              </div>
              <span className="flex-1 text-left font-medium text-foreground">{item.label}</span>
              {item.label === "Saved Addresses" ? (
                <Badge variant={addressCount > 0 ? "softSuccess" : "secondary"}>
                  {addressCount > 0 ? `${addressCount} saved` : "No saved"}
                </Badge>
              ) : item.label === "Family Members" ? (
                <Badge variant={familyMembers.length > 0 ? "softSuccess" : "secondary"}>
                  {familyMembers.length > 0 ? `${familyMembers.length} members` : "Add"}
                </Badge>
              ) : item.label === "Subscription Plans" && isActive && membershipType ? (
                <Badge variant="softSuccess">
                  Active
                </Badge>
              ) : (
                item.badge && (
                  <Badge variant={item.badge === "New" ? "soft" : item.badge.includes("₹") ? "softSuccess" : "secondary"}>
                    {item.badge}
                  </Badge>
                )
              )}
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </motion.button>
          ))}
        </motion.div>

        {/* Logout */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-6"
        >
          <Button 
            variant="ghost" 
            className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleLogout}
          >
            <LogOut className="w-5 h-5" />
            Log Out
          </Button>
        </motion.div>

        {/* Version */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center text-xs text-muted-foreground mt-6"
        >
           BloodLyn v2.1.0 • Made with ❤️
        </motion.p>
      </div>

    </MobileLayout>
  );
};

export default ProfileScreen;
