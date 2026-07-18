import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";

/**
 * Global listener for doctor availability changes.
 *
 * Subscribes to Realtime channel `doctor_availability`, event `availability`.
 * Payload: { doctor_id, is_available, status?, is_active? }
 *
 * On unavailability (is_available=false, status!=='approved', or is_active===false):
 *  1) Evicts the doctor from every React Query cache entry that looks like a
 *     doctor list/search/detail.
 *  2) Cancels any in-flight booking by removing matching cart items.
 *  3) Broadcasts a window event `doctor-unavailable` so open screens
 *     (DoctorConsultScreen, PaymentScreen, detail pages) can react.
 */
export const evictDoctorFromCaches = (
  queryClient: ReturnType<typeof useQueryClient>,
  doctorId: string,
) => {
  const id = String(doctorId);

  // Sweep every cached query. If the data references this doctor, prune or invalidate it.
  const cache = queryClient.getQueryCache();
  cache.getAll().forEach((entry) => {
    const key = entry.queryKey;
    const keyStr = JSON.stringify(key).toLowerCase();
    const isDoctorLike =
      keyStr.includes("doctor") ||
      keyStr.includes("directory") ||
      keyStr.includes("consult");

    if (!isDoctorLike) return;

    const data: any = entry.state.data;
    if (!data) return;

    // Array of doctors
    if (Array.isArray(data)) {
      const next = data.filter((d) => String(d?.id ?? d?.doctor_id) !== id);
      if (next.length !== data.length) queryClient.setQueryData(key, next);
      return;
    }
    // { doctors: [...] }
    if (Array.isArray(data?.doctors)) {
      const next = data.doctors.filter(
        (d: any) => String(d?.id ?? d?.doctor_id) !== id,
      );
      if (next.length !== data.doctors.length) {
        queryClient.setQueryData(key, { ...data, doctors: next });
      }
      return;
    }
    // Single doctor detail
    if (data?.id != null && String(data.id) === id) {
      queryClient.removeQueries({ queryKey: key });
    }
  });

  // Notify any listening screen
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("doctor-unavailable", { detail: { doctorId: id } }),
    );
  }
};

const DoctorAvailabilityListener = () => {
  const queryClient = useQueryClient();
  const { items, removeFromCart } = useCart();

  useEffect(() => {
    const channel = supabase
      .channel("doctor_availability")
      .on("broadcast", { event: "availability" }, (msg) => {
        const payload: any = (msg as any)?.payload ?? {};
        const doctorId =
          payload?.doctor_id != null ? String(payload.doctor_id) : null;
        if (!doctorId) return;

        const isAvailable = payload?.is_available;
        const approved = payload?.status
          ? String(payload.status).toLowerCase() === "approved"
          : true;
        const active = payload?.is_active !== false;

        if (isAvailable === false || !approved || !active) {
          evictDoctorFromCaches(queryClient, doctorId);
          // Cancel any in-flight booking: drop matching cart items
          items.forEach((it) => {
            if (typeof it.id === "string" && it.id.includes(doctorId)) {
              removeFromCart(it.id);
            }
          });
          toast.info("A doctor is no longer available and was removed.");
        } else {
          // Availability restored — invalidate directory queries to refetch
          queryClient.invalidateQueries({
            predicate: (q) =>
              JSON.stringify(q.queryKey).toLowerCase().includes("doctor"),
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, items, removeFromCart]);

  return null;
};

export default DoctorAvailabilityListener;
