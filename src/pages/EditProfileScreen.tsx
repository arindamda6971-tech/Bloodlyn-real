import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { User, Camera, Mail, Phone, Calendar, UserCircle2, Droplets, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import MobileLayout from "@/components/layout/MobileLayout";
import ScreenHeader from "@/components/layout/ScreenHeader";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const EditProfileScreen = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [supabaseUserId, setSupabaseUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState({
    full_name: "",
    email: "",
    phone: "",
    date_of_birth: "",
    gender: "",
    blood_group: "",
  });

  useEffect(() => {
    const getSupabaseUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        setSupabaseUserId(session.user.id);
      }
    };
    getSupabaseUser();
  }, []);

  useEffect(() => {
    if (supabaseUserId) {
      fetchProfile();
    }
  }, [supabaseUserId]);

  const fetchProfile = async () => {
    if (!supabaseUserId) return;
    
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", supabaseUserId)
      .maybeSingle();

    if (data) {
      setProfile({
        full_name: data.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name || "",
        email: data.email || user?.email || "",
        phone: data.phone || user?.phone || "",
        date_of_birth: data.date_of_birth || "",
        gender: data.gender || "",
        blood_group: data.blood_group || "",
      });
    } else {
      setProfile({
        full_name: user?.user_metadata?.full_name || user?.user_metadata?.name || "",
        email: user?.email || "",
        phone: user?.phone || "",
        date_of_birth: "",
        gender: "",
        blood_group: "",
      });
    }
  };

  const handleSave = async () => {
    if (!supabaseUserId) {
      toast.error("Unable to save. Please try logging in again.");
      return;
    }
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .upsert({
          id: supabaseUserId,
          ...profile,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
      
      toast.success("Profile updated successfully");
      navigate("/profile");
    } catch (error) {
      console.error("Profile save error:", error);
      toast.error("Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <MobileLayout showNav={false} className="bg-background">
      <ScreenHeader title="Edit Profile" />

      <div className="px-5 pb-32 pt-6 max-w-md mx-auto">
        {/* Professional Profile Avatar Section */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center mb-10"
        >
          <div className="relative group">
            <div className="w-28 h-28 rounded-[2.5rem] p-1 bg-gradient-to-tr from-primary/40 via-primary to-success/40 shadow-2xl overflow-hidden transform group-hover:scale-105 transition-transform duration-300">
              <div className="w-full h-full rounded-[2.3rem] overflow-hidden bg-card ring-4 ring-background">
                {user?.user_metadata?.avatar_url ? (
                  <img
                    src={user.user_metadata.avatar_url}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-primary/5">
                    <User className="w-12 h-12 text-primary/40" />
                  </div>
                )}
              </div>
            </div>
            <button className="absolute -bottom-1 -right-1 w-10 h-10 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg border-4 border-background active:scale-90 transition-transform">
              <Camera className="w-5 h-5" />
            </button>
          </div>
          <p className="text-xs font-bold text-primary uppercase tracking-widest mt-4">Change Photo</p>
        </motion.div>

        {/* Professional Form Layout */}
        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 px-1">Basic Information</h3>

            <div className="space-y-2">
              <Label className="text-xs font-bold ml-1 text-foreground/70">Full Name</Label>
              <div className="relative group">
                <UserCircle2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  value={profile.full_name}
                  onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                  placeholder="Enter full name"
                  className="pl-12 bg-muted/30 border-border/50 rounded-2xl py-6 font-semibold focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold ml-1 text-foreground/70">Email Address</Label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  placeholder="name@example.com"
                  className="pl-12 bg-muted/30 border-border/50 rounded-2xl py-6 font-semibold focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold ml-1 text-foreground/70">Phone Number</Label>
              <div className="relative group">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  placeholder="+91 00000 00000"
                  className="pl-12 bg-muted/30 border-border/50 rounded-2xl py-6 font-semibold focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-border/40">
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 px-1">Personal Details</h3>

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold ml-1 text-foreground/70">Date of Birth</Label>
                <div className="relative group">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors z-10 pointer-events-none" />
                  <Input
                    type="date"
                    value={profile.date_of_birth}
                    onChange={(e) => setProfile({ ...profile, date_of_birth: e.target.value })}
                    className="pl-12 bg-muted/30 border-border/50 rounded-2xl py-6 font-semibold focus:ring-primary/20 focus:border-primary transition-all appearance-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold ml-1 text-foreground/70">Gender</Label>
                  <Select value={profile.gender} onValueChange={(value) => setProfile({ ...profile, gender: value })}>
                    <SelectTrigger className="bg-muted/30 border-border/50 rounded-2xl py-6 font-semibold focus:ring-primary/20">
                      <SelectValue placeholder="Gender" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      <SelectItem value="male" className="rounded-xl">Male</SelectItem>
                      <SelectItem value="female" className="rounded-xl">Female</SelectItem>
                      <SelectItem value="other" className="rounded-xl">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold ml-1 text-foreground/70">Blood Group</Label>
                  <Select value={profile.blood_group} onValueChange={(value) => setProfile({ ...profile, blood_group: value })}>
                    <SelectTrigger className="bg-muted/30 border-border/50 rounded-2xl py-6 font-semibold focus:ring-primary/20">
                      <div className="flex items-center gap-2">
                        <Droplets className="w-4 h-4 text-destructive" />
                        <SelectValue placeholder="Group" />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map(g => (
                        <SelectItem key={g} value={g} className="rounded-xl font-bold">{g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Button (Industry Standard) */}
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto p-6 bg-gradient-to-t from-background via-background to-transparent pointer-events-none"
      >
        <Button
          className="w-full h-14 rounded-2xl bg-primary text-white text-md font-black shadow-xl shadow-primary/25 active:scale-95 transition-all pointer-events-auto"
          onClick={handleSave}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            "Update Profile"
          )}
        </Button>
      </motion.div>
    </MobileLayout>
  );
};

export default EditProfileScreen;
