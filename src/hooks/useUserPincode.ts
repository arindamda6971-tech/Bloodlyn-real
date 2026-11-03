import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getServicePincode, SERVICE_PIN_CHANGED_EVENT, setServicePincode } from "@/lib/service-pincode";

/**
 * Returns the current user's serviceable pincode.
 * Source of truth: the default address saved by LocationCheckScreen.
 * Falls back to the most-recent address if no default is flagged.
 */
export const useUserPincode = () => {
  const { user } = useAuth();
  const [pincode, setPincode] = useState<string | null>(() =>
    user?.id ? getServicePincode(user.id) : null
  );
  const [loading, setLoading] = useState<boolean>(() =>
    !(user?.id && getServicePincode(user.id))
  );

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!user) {
        if (!cancelled) {
          setPincode((prev) => (prev !== null ? null : prev));
          setLoading(false);
        }
        return;
      }
      const temporaryPincode = getServicePincode(user.id);
      if (temporaryPincode) {
        if (!cancelled) {
          setPincode((prev) => (prev !== temporaryPincode ? temporaryPincode : prev));
          setLoading(false);
        }
        return;
      }
      try {
        const { data } = await supabase
          .from("addresses")
          .select("pincode, is_default, created_at")
          .eq("user_id", user.id)
          .order("is_default", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(1);
        if (cancelled) return;
        const pc = data?.[0]?.pincode?.trim() || null;
        const valid = pc && /^\d{6}$/.test(pc) ? pc : null;
        setPincode((prev) => (prev !== valid ? valid : prev));
        if (valid) setServicePincode(user.id, valid);
      } catch {
        if (!cancelled) setPincode(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    const handlePincodeChanged = (event: Event) => {
      const next = (event as CustomEvent<string>).detail;
      if (/^\d{6}$/.test(next)) {
        setPincode((prev) => (prev !== next ? next : prev));
      }
    };
    window.addEventListener(SERVICE_PIN_CHANGED_EVENT, handlePincodeChanged);
    load();
    return () => {
      cancelled = true;
      window.removeEventListener(SERVICE_PIN_CHANGED_EVENT, handlePincodeChanged);
    };
  }, [user]);

  return { pincode, loading };
};

// One rule for the screens and create-order: the lab's own PIN plus its service PINs.
export { labServesPincode } from "../../supabase/functions/_shared/service-area";
