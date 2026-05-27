import { useEffect, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useNavigate } from "react-router-dom";
<<<<<<< HEAD
import { MapPin, Edit2, Trash2, Loader, Star, Plus, Home, Briefcase } from "lucide-react";
=======
import { MapPin, Edit2, Trash2, Loader, Star, Plus, ArrowLeft } from "lucide-react";
>>>>>>> d623537 (feat: Comprehensive Futuristic UI overhaul and Squeezable Header system)
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import MobileLayout from "@/components/layout/MobileLayout";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Tables } from "@/integrations/supabase/types";

type Address = Tables<"addresses">;

const SavedAddressesScreen = () => {
  const navigate = useNavigate();
  const { supabaseUserId } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Address | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [locLoading, setLocLoading] = useState(false);

  // Header Squeeze logic
  const { scrollY } = useScroll();
  const headerHeight = useTransform(scrollY, [0, 60], [100, 70]);
  const titleOpacity = useTransform(scrollY, [0, 30], [1, 0.5]);
  const titleScale = useTransform(scrollY, [0, 30], [1, 0.9]);

  // Form state
  const [formData, setFormData] = useState({
    type: "Home",
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    pincode: "",
    latitude: null as number | null,
    longitude: null as number | null,
  });

  const fetchAddresses = async () => {
    if (!supabaseUserId) { setLoading(false); return; }
    try {
      setLoading(true);
      const { data } = await supabase
        .from("addresses")
        .select("*")
        .eq("user_id", supabaseUserId)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });
      setAddresses(data || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchAddresses(); }, [supabaseUserId]);

  const resetForm = () => {
    setFormData({ type: "Home", address_line1: "", address_line2: "", city: "", state: "", pincode: "", latitude: null, longitude: null });
  };

  const startAdd = () => { setEditing(null); resetForm(); setIsAdding(true); };
  const startEdit = (address: Address) => {
    setEditing(address);
    setFormData({
      type: address.type || "Home", address_line1: address.address_line1, address_line2: address.address_line2 || "",
      city: address.city, state: address.state, pincode: address.pincode, latitude: address.latitude, longitude: address.longitude
    });
    setIsAdding(false);
  };

  const handleUseCurrentLocation = () => {
    if (!navigator?.geolocation) { toast.error("Geolocation not supported"); return; }
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const lat = pos.coords.latitude; const lon = pos.coords.longitude;
      setFormData(prev => ({ ...prev, latitude: lat, longitude: lon }));
      setLocLoading(false);
      toast.success("Location found");
    }, () => { setLocLoading(false); toast.error("Failed to get location"); });
  };

  const handleSave = async () => {
    if (!supabaseUserId || !formData.address_line1.trim() || !formData.city.trim() || !formData.pincode.trim()) {
      toast.error("Please fill required fields"); return;
    }
    setSaving(true);
    try {
      if (editing) {
        await supabase.from("addresses").update({ ...formData }).eq("id", editing.id);
        toast.success("Address updated");
      } else {
        await supabase.from("addresses").insert({ ...formData, user_id: supabaseUserId, is_default: addresses.length === 0 });
        toast.success("Address added");
      }
      setEditing(null); setIsAdding(false); resetForm(); await fetchAddresses();
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    await supabase.from("addresses").delete().eq("id", id);
    toast.success("Address removed"); await fetchAddresses();
  };

  const handleSetDefault = async (id: string) => {
    await supabase.from("addresses").update({ is_default: false }).eq("user_id", supabaseUserId);
    await supabase.from("addresses").update({ is_default: true }).eq("id", id);
    toast.success("Default address updated"); await fetchAddresses();
  };

  return (
    <MobileLayout showNav={false}>
      <motion.header
        className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40 px-6 overflow-hidden flex items-center justify-between"
        style={{ height: headerHeight, paddingTop: "calc(env(safe-area-inset-top, 24px) + 8px)" }}
      >
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-white/50 flex items-center justify-center border border-white/20 shadow-sm">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <motion.h1 style={{ opacity: titleOpacity, scale: titleScale, originX: 0 }} className="text-lg font-black text-foreground tracking-tight">Saved Addresses</motion.h1>
        </div>
      </motion.header>

      <div className="px-6 pb-32">
        {!isAdding && !editing && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
            <p className="text-sm font-bold text-muted-foreground opacity-60">Manage your saved addresses for faster bookings.</p>
          </motion.div>
        )}

        {editing !== null || isAdding ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 space-y-6">
            <div className="soft-card border border-white/50 bg-white/60 backdrop-blur-md p-6 space-y-5">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Address Type</Label>
                <Select value={formData.type} onValueChange={(v) => setFormData(prev => ({ ...prev, type: v }))}>
                  <SelectTrigger className="bg-white/50 border-white/20 rounded-xl h-12"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Home">Home</SelectItem><SelectItem value="Office">Office</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Address Line 1</Label>
                <Input value={formData.address_line1} onChange={(e) => setFormData(prev => ({ ...prev, address_line1: e.target.value }))} className="bg-white/50 border-white/20 rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">City</Label><Input value={formData.city} onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))} className="bg-white/50 border-white/20 rounded-xl" /></div>
                <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Pincode</Label><Input value={formData.pincode} onChange={(e) => setFormData(prev => ({ ...prev, pincode: e.target.value }))} className="bg-white/50 border-white/20 rounded-xl" maxLength={6} /></div>
              </div>
              <Button variant="outline" className="w-full rounded-xl border-dashed" onClick={handleUseCurrentLocation} disabled={locLoading}>{locLoading ? "Locating..." : "Use Current Location"}</Button>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1 rounded-xl h-12 font-black uppercase tracking-widest text-[10px]" onClick={() => { setEditing(null); setIsAdding(false); resetForm(); }}>Cancel</Button>
                <Button variant="hero" className="flex-1 rounded-xl h-12 font-black uppercase tracking-widest text-[10px]" onClick={handleSave} disabled={saving}>Save Address</Button>
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="mt-6 space-y-4">
            {loading ? (
              <div className="py-20 text-center"><Loader className="mx-auto w-8 h-8 animate-spin text-primary" /></div>
            ) : addresses.length === 0 ? (
              <div className="py-20 text-center"><MapPin className="mx-auto w-12 h-12 text-muted-foreground opacity-20 mb-4" /><p className="font-bold text-muted-foreground opacity-40">No saved addresses yet.</p></div>
            ) : (
<<<<<<< HEAD
              <div className="space-y-3">
                {addresses.map((address) => {
                  const t = (address.type || "Home").toLowerCase();
                  const TypeIcon = t === "office" ? Briefcase : t === "other" ? MapPin : Home;
                  const tint =
                    t === "office"
                      ? "from-secondary/20 to-secondary/5 text-secondary"
                      : t === "other"
                      ? "from-warning/20 to-warning/5 text-warning"
                      : "from-primary/20 to-primary/5 text-primary";
                  return (
                    <div
                      key={address.id}
                      className="relative rounded-2xl border border-border bg-card p-4 shadow-sm overflow-hidden"
                    >
                      {address.is_default && (
                        <div className="absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-200 to-amber-100 text-amber-900 text-[10px] font-semibold">
                          <Star className="w-3 h-3 fill-amber-700" /> Default
                        </div>
                      )}
                      <div className="flex items-start gap-3">
                        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${tint} flex items-center justify-center flex-shrink-0`}>
                          <TypeIcon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground capitalize">{address.type || "Home"}</p>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {address.address_line1}
                            {address.address_line2 && `, ${address.address_line2}`}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {address.city}, {address.state} <span className="text-foreground/70">- {address.pincode}</span>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                        {!address.is_default && (
                          <Button variant="ghost" size="sm" className="text-xs flex-1" onClick={() => handleSetDefault(address.id)}>
                            <Star className="w-3 h-3 mr-1" /> Set Default
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" className="text-xs" onClick={() => startEdit(address)}>
                          <Edit2 className="w-3 h-3 mr-1" /> Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-destructive hover:text-destructive"
                          onClick={() => handleDelete(address.id)}
                        >
                          <Trash2 className="w-3 h-3 mr-1" /> Delete
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
=======
              addresses.map((addr) => (
                <motion.div key={addr.id} whileTap={{ scale: 0.98 }} className="soft-card border border-white/50 bg-white/60 backdrop-blur-md p-5 shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-[1.2rem] bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0 border border-primary/10 text-primary"><MapPin className="w-6 h-6" /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1"><p className="font-black text-foreground text-[15px]">{addr.type || "Home"}</p>{addr.is_default && <span className="text-[9px] font-black bg-primary text-white px-2 py-0.5 rounded-full uppercase tracking-tighter">Default</span>}</div>
                      <p className="text-sm font-bold text-muted-foreground opacity-70 line-clamp-1">{addr.address_line1}</p>
                      <p className="text-[11px] font-black text-muted-foreground/50 mt-1 uppercase tracking-tight">{addr.city} • {addr.pincode}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-5 pt-4 border-t border-white/40">
                    {!addr.is_default && <button onClick={() => handleSetDefault(addr.id)} className="flex-1 text-[10px] font-black text-primary uppercase tracking-widest h-10 rounded-xl bg-primary/5 border border-primary/10">Set Default</button>}
                    <button onClick={() => startEdit(addr)} className="p-2.5 rounded-xl bg-white/80 border border-border/50 text-muted-foreground shadow-sm"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(addr.id)} className="p-2.5 rounded-xl bg-destructive/5 border border-destructive/10 text-destructive shadow-sm"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </motion.div>
              ))
>>>>>>> d623537 (feat: Comprehensive Futuristic UI overhaul and Squeezable Header system)
            )}
          </div>
        )}
      </div>

      {!isAdding && !editing && (
        <motion.div initial={{ y: 100 }} animate={{ y: 0 }} className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto bg-background/60 backdrop-blur-xl border-t border-white/20 px-6 py-6 pb-[calc(env(safe-area-inset-bottom,0px)+12px)]">
          <Button variant="hero" className="w-full h-14 rounded-2xl font-black text-sm tracking-widest uppercase shadow-2xl shadow-primary/20" onClick={startAdd}><Plus className="w-5 h-5 mr-2" />Add New Address</Button>
        </motion.div>
      )}
    </MobileLayout>
  );
};

export default SavedAddressesScreen;
