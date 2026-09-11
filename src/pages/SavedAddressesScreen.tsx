import { useEffect, useState, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { MapPin, Edit2, Trash2, Loader, Star, Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import MobileLayout from "@/components/layout/MobileLayout";
import ScreenHeader from "@/components/layout/ScreenHeader";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { sanitizePincode } from "@/utils/inputSanitizers";
import { useAuth } from "@/hooks/useAuth";
import { triggerHaptic } from "@/utils/haptics";
import type { Tables } from "@/integrations/supabase/types";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const [deleteId, setDeleteId] = useState<string | null>(null);

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

  // Fetch addresses from Supabase
  const fetchAddresses = useCallback(async () => {
    if (!supabaseUserId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("addresses")
        .select("*")
        .eq("user_id", supabaseUserId)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching addresses:", error);
        setAddresses([]);
      } else {
        setAddresses(data || []);
      }
    } catch (err) {
      console.error("Exception fetching addresses:", err);
      setAddresses([]);
    } finally {
      setLoading(false);
    }
  }, [supabaseUserId]);

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  // Deep-link: /saved-addresses?add=1 opens the "add address" form directly.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("add") === "1") {
      setIsAdding(true);
      setEditing(null);
    }
  }, []);


  const resetForm = () => {
    setFormData({
      type: "Home",
      address_line1: "",
      address_line2: "",
      city: "",
      state: "",
      pincode: "",
      latitude: null,
      longitude: null,
    });
  };

  const startAdd = () => {
    setEditing(null);
    resetForm();
    setIsAdding(true);
  };

  const startEdit = (address: Address) => {
    setEditing(address);
    setFormData({
      type: address.type || "Home",
      address_line1: address.address_line1,
      address_line2: address.address_line2 || "",
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      latitude: address.latitude,
      longitude: address.longitude,
    });
    setIsAdding(false);
  };

  const reverseGeocode = async (lat: number, lon: number) => {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`;
      const res = await fetch(url, {
        headers: {
          "Accept": "application/json",
          "User-Agent": "BloodlynApp/1.0"
        }
      });
      const data = await res.json();
      return data;
    } catch (err) {
      console.error("Reverse geocode failed", err);
      return null;
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator?.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setLocLoading(true);

    navigator.geolocation.getCurrentPosition(async (pos) => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;

      setFormData(prev => ({
        ...prev,
        latitude: lat,
        longitude: lon,
      }));

      const geoData = await reverseGeocode(lat, lon);
      if (geoData && geoData.address) {
        setFormData(prev => ({
          ...prev,
          address_line1: geoData.address.road || geoData.address.suburb || "",
          city: geoData.address.city || geoData.address.town || geoData.address.village || "",
          state: geoData.address.state || "",
          pincode: geoData.address.postcode || "",
        }));
      }

      setLocLoading(false);
    }, (err) => {
      console.error("Geolocation error", err);
      if (err.code === 1) toast.error("Location permission denied");
      else toast.error("Failed to get location");
      setLocLoading(false);
    }, { enableHighAccuracy: true, timeout: 15000 });
  };

  const isSavingRef = useRef(false);

  const handleSave = async () => {
    if (isSavingRef.current) return;
    
    if (!supabaseUserId) {
      toast.error("Please log in to save addresses");
      return;
    }

    if (!formData.address_line1.trim()) {
      toast.error("Please enter an address");
      return;
    }

    if (!formData.city.trim() || !formData.state.trim() || !formData.pincode.trim()) {
      toast.error("Please fill in city, state, and pincode");
      return;
    }

    isSavingRef.current = true;
    setSaving(true);

    try {
      if (editing) {
        const { error } = await supabase
          .from("addresses")
          .update({
            type: formData.type,
            address_line1: formData.address_line1,
            address_line2: formData.address_line2 || null,
            city: formData.city,
            state: formData.state,
            pincode: formData.pincode,
            latitude: formData.latitude,
            longitude: formData.longitude,
          })
          .eq("id", editing.id)
          .eq("user_id", supabaseUserId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("addresses")
          .insert({
            user_id: supabaseUserId,
            type: formData.type,
            address_line1: formData.address_line1,
            address_line2: formData.address_line2 || null,
            city: formData.city,
            state: formData.state,
            pincode: formData.pincode,
            latitude: formData.latitude,
            longitude: formData.longitude,
            is_default: addresses.length === 0,
          });

        if (error) throw error;
      }

      await triggerHaptic('success');
      setEditing(null);
      setIsAdding(false);
      resetForm();
      await fetchAddresses();
    } catch (err: any) {
      console.error("Save error:", err);
      toast.error(err?.message || "Failed to save address");
    } finally {
      isSavingRef.current = false;
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!supabaseUserId) return;

    try {
      const { error } = await supabase
        .from("addresses")
        .delete()
        .eq("id", id)
        .eq("user_id", supabaseUserId);

      if (error) {
        if (error.code === "23503") {
          toast.error("Cannot delete address as it is used in an existing order");
        } else {
          throw error;
        }
      } else {
        await fetchAddresses();
      }
    } catch (err: any) {
      console.error("Delete error:", err);
      toast.error(err.message || "Failed to delete address");
    } finally {
      setDeleteId(null);
    }
  };

  const queryClient = useQueryClient();

  const handleSetDefault = async (id: string) => {
    if (!supabaseUserId) return;

    try {
      await supabase
        .from("addresses")
        .update({ is_default: false })
        .eq("user_id", supabaseUserId);

      const { error } = await supabase
        .from("addresses")
        .update({ is_default: true })
        .eq("id", id)
        .eq("user_id", supabaseUserId);

      if (error) throw error;
      await fetchAddresses();
      queryClient.invalidateQueries();
      toast.success("Default location updated!");
    } catch (err) {
      console.error("Set default error:", err);
      toast.error("Failed to set default address");
    }
  };

  return (
    <MobileLayout showNav={false}>
      <ScreenHeader title="Saved Addresses" />

      <div className="px-4 pb-32">
        <motion.div initial={false} animate={{ opacity: 1, y: 0 }} className="mt-4">
          <p className="text-sm text-muted-foreground">
            Manage your saved addresses for faster bookings and sample collection.
          </p>
        </motion.div>

        {editing !== null || isAdding ? (
          <motion.div initial={false} animate={{ opacity: 1, y: 0 }} className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label>Address Type</Label>
              <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}>
                <SelectTrigger className="bg-muted border-0">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Home">Home</SelectItem>
                  <SelectItem value="Office">Office</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address_line1">Address Line 1 *</Label>
              <Input
                id="address_line1"
                value={formData.address_line1}
                onChange={(e) => setFormData(prev => ({ ...prev, address_line1: e.target.value }))}
                placeholder="House/Flat No., Building, Street"
                className="bg-muted border-0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address_line2">Address Line 2</Label>
              <Input
                id="address_line2"
                value={formData.address_line2}
                onChange={(e) => setFormData(prev => ({ ...prev, address_line2: e.target.value }))}
                placeholder="Landmark, Area (Optional)"
                className="bg-muted border-0"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                  placeholder="City"
                  className="bg-muted border-0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State *</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                  placeholder="State"
                  className="bg-muted border-0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pincode">Pincode *</Label>
              <Input
                id="pincode"
                type="text"
                inputMode="numeric"
                value={formData.pincode}
                onChange={(e) => setFormData(prev => ({ ...prev, pincode: sanitizePincode(e.target.value) }))}
                placeholder="6-digit pincode"
                className="bg-muted border-0"
                maxLength={6}
              />
            </div>


            <div className="flex gap-3 mt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setEditing(null);
                  setIsAdding(false);
                  resetForm();
                }}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button variant="hero" className="flex-1" onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Address"
                )}
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div initial={false} animate={{ opacity: 1, y: 0 }} className="mt-6">
            {loading ? (
              <div className="soft-card p-6 text-center text-muted-foreground">
                <Loader className="mx-auto w-8 h-8 text-muted-foreground animate-spin" />
                <p className="mt-3">Loading addresses...</p>
              </div>
            ) : addresses.length === 0 ? (
              <div className="soft-card p-6 text-center text-muted-foreground">
                <MapPin className="mx-auto w-8 h-8 text-muted-foreground" />
                <p className="mt-3">No saved addresses yet.</p>
                <p className="text-sm">Tap Add to create your first address.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {addresses.map((address) => (
                  <div
                    key={address.id}
                    onClick={() => !address.is_default && handleSetDefault(address.id)}
                    className={`soft-card p-4 transition-all cursor-pointer ${
                      address.is_default
                        ? "border-primary/80 bg-primary/5 ring-1 ring-primary/30 shadow-sm"
                        : "hover:border-primary/40 hover:bg-accent/30"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        address.is_default ? "bg-primary text-white shadow-xs" : "bg-primary/10 text-primary"
                      }`}>
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-foreground capitalize">{address.type || "Home"}</p>
                          {address.is_default && (
                            <Badge variant="soft" className="text-xs bg-primary/20 text-primary font-bold flex items-center gap-1">
                              <Check className="w-3 h-3" /> Default
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {address.address_line1}
                          {address.address_line2 && `, ${address.address_line2}`}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {address.city}, {address.state} - {address.pincode}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/60" onClick={(e) => e.stopPropagation()}>
                      {!address.is_default && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs flex-1 text-primary hover:text-primary hover:bg-primary/10 font-bold"
                          onClick={() => handleSetDefault(address.id)}
                        >
                          <Star className="w-3 h-3 mr-1" />
                          Set as Default
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" className="text-xs" onClick={() => startEdit(address)}>
                        <Edit2 className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(address.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="max-w-[90vw] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Address?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this address? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bottom buttons — always show "Add Address Manually" */}
      {!isAdding && !editing && (
        <motion.div
          initial={false}
          animate={{ y: 0 }}
          className="fixed bottom-0 left-0 right-0 w-full md:max-w-[430px] mx-auto bg-/98 border-t border-border px-4 py-4 safe-area-bottom"
        >
          <Button variant="hero" className="w-full" onClick={startAdd}>
            <Plus className="w-4 h-4 mr-2" />
            Add Address
          </Button>
        </motion.div>
      )}
    </MobileLayout>
  );
};

export default SavedAddressesScreen;
