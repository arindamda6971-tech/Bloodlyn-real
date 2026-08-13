import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type AddressItem = {
  id: string;
  address: string;
  phone: string;
  lat?: number | null;
  lon?: number | null;
};

type AddressDBRow = {
  id: string;
  user_id: string;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  address?: string | null;
  phone?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  is_default?: boolean;
  type?: string | null;
};

type AddressContextType = {
  addresses: AddressItem[];
  defaultAddressId: string | null;
  addAddress: (a: Omit<AddressItem, "id">) => Promise<AddressItem | null>;
  updateAddress: (id: string, patch: Partial<AddressItem>) => Promise<void>;
  removeAddress: (id: string) => Promise<void>;
  setDefaultAddress: (id: string | null) => Promise<void>;
  loading: boolean;
};

const AddressContext = createContext<AddressContextType | null>(null);

export const AddressProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [addresses, setAddresses] = useState<AddressItem[]>([]);
  const [defaultAddressId, setDefaultAddressId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          setUserId(session.user.id);
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error("Error getting user session:", err);
        setLoading(false);
      }
    };
    getUser();
  }, []);

  // Load addresses from Supabase
  useEffect(() => {
    if (!userId) {
      // Try to load from localStorage fallback
      try {
        const fallback = localStorage.getItem("addresses_fallback");
        if (fallback) {
          const parsed = JSON.parse(fallback);
          if (Array.isArray(parsed)) {
            setAddresses(parsed);
          }
        }
      } catch (e) {
        console.error("Failed to load from localStorage:", e);
      }
      setLoading(false);
      return;
    }

    const loadAddresses = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("addresses")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Failed to load addresses:", error);
          // Try to load from localStorage fallback
          try {
            const fallback = localStorage.getItem("addresses_fallback");
            if (fallback) {
              const parsed = JSON.parse(fallback);
              if (Array.isArray(parsed)) {
                setAddresses(parsed);
              }
            }
          } catch (e) {
            console.error("Failed to load from localStorage:", e);
          }
          setAddresses([]);
          return;
        }

        if (data && Array.isArray(data)) {
          const mappedAddresses: AddressItem[] = data.map((addr: AddressDBRow) => {
            // Support both address_line1 format and simple address format
            const fullAddress = addr.address_line1 
              ? `${addr.address_line1}${addr.address_line2 ? ", " + addr.address_line2 : ""}${addr.city ? ", " + addr.city : ""}${addr.state ? ", " + addr.state : ""}${addr.pincode ? " " + addr.pincode : ""}`
              : "";
            return {
              id: addr.id,
              address: fullAddress || addr.address || "",
              phone: addr.phone || "",
              lat: addr.latitude ? Number(addr.latitude) : null,
              lon: addr.longitude ? Number(addr.longitude) : null,
            };
          });
          setAddresses(mappedAddresses);
          // Update localStorage with fresh data
          try {
            localStorage.setItem("addresses_fallback", JSON.stringify(mappedAddresses));
          } catch (e) {
            console.error("Failed to save to localStorage:", e);
          }

          // Get default address
          const defaultAddr = data.find((addr: AddressDBRow) => addr.is_default);
          if (defaultAddr) {
            setDefaultAddressId(defaultAddr.id);
          }
        } else {
          setAddresses([]);
        }
      } catch (err) {
        console.error("Error loading addresses:", err);
        // Try to load from localStorage fallback
        try {
          const fallback = localStorage.getItem("addresses_fallback");
          if (fallback) {
            const parsed = JSON.parse(fallback);
            if (Array.isArray(parsed)) {
              setAddresses(parsed);
            }
          }
        } catch (e) {
          console.error("Failed to load from localStorage:", e);
        }
        setAddresses([]);
      } finally {
        setLoading(false);
      }
    };

    loadAddresses();
  }, [userId]);

  const addAddress = async (a: Omit<AddressItem, "id">) => {
    if (!userId) {
      console.error("No user ID found");
      // Fallback to localStorage
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newItem: AddressItem = { id, ...a };
      setAddresses((prev) => [newItem, ...prev]);
      try {
        localStorage.setItem("addresses_fallback", JSON.stringify([newItem, ...addresses]));
      } catch (e) {
        console.error("Failed to save to localStorage:", e);
      }
      return newItem;
    }

    try {
      const insertData: Omit<AddressDBRow, "id"> = {
        user_id: userId,
        address_line1: a.address,
        phone: a.phone,
        latitude: a.lat || null,
        longitude: a.lon || null,
        city: "",
        state: "",
        pincode: "",
        type: "Home",
      };

      const { data, error } = await supabase
        .from("addresses")
        .insert([insertData])
        .select()
        .single();

      if (error) {
        console.error("Supabase insert error:", error);
        toast.error("Failed to sync your new address. Saved locally.");
        // Fallback to localStorage
        const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newItem: AddressItem = { id, ...a };
        setAddresses((prev) => [newItem, ...prev]);
        try {
          localStorage.setItem("addresses_fallback", JSON.stringify([newItem, ...addresses]));
        } catch (e) {
          console.error("Failed to save to localStorage:", e);
        }
        return newItem;
      }

      if (data) {
        const newItem: AddressItem = {
          id: data.id,
          address: a.address,
          phone: a.phone,
          lat: a.lat,
          lon: a.lon,
        };
        setAddresses((prev) => [newItem, ...prev]);
        return newItem;
      }
    } catch (err) {
      console.error("Error adding address:", err);
      toast.error("Network error while adding address. Saved locally.");
      // Fallback to localStorage
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newItem: AddressItem = { id, ...a };
      setAddresses((prev) => [newItem, ...prev]);
      try {
        localStorage.setItem("addresses_fallback", JSON.stringify([newItem, ...addresses]));
      } catch (e) {
        console.error("Failed to save to localStorage:", e);
      }
      return newItem;
    }
    return null;
  };

  const updateAddress = async (id: string, patch: Partial<AddressItem>) => {
    if (!userId) {
      console.error("No user ID found");
      // Fallback to local state
      setAddresses((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...patch } : p))
      );
      try {
        localStorage.setItem("addresses_fallback", JSON.stringify(
          addresses.map((p) => (p.id === id ? { ...p, ...patch } : p))
        ));
      } catch (e) {
        console.error("Failed to save to localStorage:", e);
      }
      return;
    }

    try {
      const updateData: Partial<AddressDBRow> = {};
      if (patch.address !== undefined) updateData.address_line1 = patch.address;
      if (patch.phone !== undefined) updateData.phone = patch.phone;
      if (patch.lat !== undefined) updateData.latitude = patch.lat;
      if (patch.lon !== undefined) updateData.longitude = patch.lon;

      const { error } = await supabase
        .from("addresses")
        .update(updateData)
        .eq("id", id)
        .eq("user_id", userId);

      if (error) {
        console.error("Supabase update error:", error);
        toast.error("Failed to update your address on the server.");
        // Fallback to local state
        setAddresses((prev) =>
          prev.map((p) => (p.id === id ? { ...p, ...patch } : p))
        );
        try {
          localStorage.setItem("addresses_fallback", JSON.stringify(
            addresses.map((p) => (p.id === id ? { ...p, ...patch } : p))
          ));
        } catch (e) {
          console.error("Failed to save to localStorage:", e);
        }
        return;
      }

      setAddresses((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...patch } : p))
      );
    } catch (err) {
      console.error("Error updating address:", err);
      toast.error("Network error while updating address.");
      // Fallback to local state
      setAddresses((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...patch } : p))
      );
      try {
        localStorage.setItem("addresses_fallback", JSON.stringify(
          addresses.map((p) => (p.id === id ? { ...p, ...patch } : p))
        ));
      } catch (e) {
        console.error("Failed to save to localStorage:", e);
      }
    }
  };

  const removeAddress = async (id: string) => {
    if (!userId) {
      console.error("No user ID found");
      // Fallback to local state
      setAddresses((prev) => prev.filter((p) => p.id !== id));
      if (defaultAddressId === id) setDefaultAddressId(null);
      try {
        localStorage.setItem("addresses_fallback", JSON.stringify(
          addresses.filter((p) => p.id !== id)
        ));
      } catch (e) {
        console.error("Failed to save to localStorage:", e);
      }
      return;
    }

    try {
      const { error } = await supabase
        .from("addresses")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);

      if (error) {
        console.error("Supabase delete error:", error);
        toast.error("Failed to delete address from server.");
        // Fallback to local state
        setAddresses((prev) => prev.filter((p) => p.id !== id));
        if (defaultAddressId === id) setDefaultAddressId(null);
        try {
          localStorage.setItem("addresses_fallback", JSON.stringify(
            addresses.filter((p) => p.id !== id)
          ));
        } catch (e) {
          console.error("Failed to save to localStorage:", e);
        }
        return;
      }

      setAddresses((prev) => prev.filter((p) => p.id !== id));
      if (defaultAddressId === id) setDefaultAddressId(null);
    } catch (err) {
      console.error("Error deleting address:", err);
      toast.error("Network error while deleting address.");
      // Fallback to local state
      setAddresses((prev) => prev.filter((p) => p.id !== id));
      if (defaultAddressId === id) setDefaultAddressId(null);
      try {
        localStorage.setItem("addresses_fallback", JSON.stringify(
          addresses.filter((p) => p.id !== id)
        ));
      } catch (e) {
        console.error("Failed to save to localStorage:", e);
      }
    }
  };

  const setDefaultAddress = async (id: string | null) => {
    if (!userId) {
      console.error("No user ID found");
      return;
    }

    try {
      // Clear previous default
      const { error: clearError } = await supabase
        .from("addresses")
        .update({ is_default: false })
        .eq("user_id", userId);

      if (clearError) {
        console.error("Failed to clear default:", clearError);
        throw new Error(clearError.message || "Failed to clear default");
      }

      // Set new default if id is provided
      if (id) {
        const { error: setError } = await supabase
          .from("addresses")
          .update({ is_default: true })
          .eq("id", id)
          .eq("user_id", userId);

        if (setError) {
          console.error("Failed to set default:", setError);
          throw new Error(setError.message || "Failed to set default");
        }
      }

      setDefaultAddressId(id);
    } catch (err) {
      console.error("Error setting default address:", err);
      throw err;
    }
  };

  return (
    <AddressContext.Provider
      value={{
        addresses,
        defaultAddressId,
        addAddress,
        updateAddress,
        removeAddress,
        setDefaultAddress,
        loading,
      }}
    >
      {children}
    </AddressContext.Provider>
  );
};

export const useAddresses = () => {
  const ctx = useContext(AddressContext);
  if (!ctx) throw new Error("useAddresses must be used within AddressProvider");
  return ctx;
};

export default AddressContext;
