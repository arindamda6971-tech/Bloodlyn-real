import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Returns the current user's serviceable pincode.
 * Source of truth: the default address saved by LocationCheckScreen.
 * Falls back to the most-recent address if no default is flagged.
 */
export const useUserPincode = () => {
  const { user } = useAuth();
  const [pincode, setPincode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!user) {
        if (!cancelled) {
          setPincode(null);
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
        setPincode(pc && /^\d{6}$/.test(pc) ? pc : null);
      } catch {
        if (!cancelled) setPincode(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return { pincode, loading };
};

/**
 * Returns true if a lab serves the given user pincode.
 * Match priority:
 *   1. lab.service_pincodes array contains user pincode  (preferred — Partner project field)
 *   2. lab.pincode equals user pincode                    (fallback for labs not yet migrated)
 * If userPincode is null (no address yet), all labs pass through (no regression).
 */
export const labServesPincode = (
  lab: { pincode?: string | null; service_pincodes?: unknown } | null | undefined,
  userPincode: string | null
): boolean => {
  if (!userPincode) return true;
  if (!lab) return false;
  const list = Array.isArray((lab as any).service_pincodes)
    ? ((lab as any).service_pincodes as unknown[]).map((p) => String(p).trim())
    : [];
  if (list.length > 0) return list.includes(userPincode);
  // Fallback: lab's own pincode
  return (lab.pincode || "").trim() === userPincode;
};
