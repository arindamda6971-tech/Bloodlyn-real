import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface DeliveryFeeRule {
  min_mrp: number;
  max_mrp: number | null;
  fee: number;
}

/**
 * Fetches MRP-based delivery fee rules from the local diagnostic_centers table.
 * These rules are synced from the Partner Portal's mrp_delivery_rules table
 * via the blood-lyn-sync edge function into diagnostic_centers.delivery_fee_rules.
 *
 * @param labId - The diagnostic_centers.id (NOT vendor_id / auth user id)
 * @param subtotal - The cart subtotal (MRP total before discount)
 */
export function useCollectionFee(labId: string | null | undefined, subtotal: number) {
  const [collectionFee, setCollectionFee] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function fetchFee() {
      console.log("[useCollectionFee] fetchFee called. labId:", labId, "subtotal:", subtotal);
      if (!labId) {
        if (active) {
          setCollectionFee(0);
          setLoading(false);
        }
        return;
      }

      try {
        // Read delivery_fee_rules from the local diagnostic_centers table.
        // These are synced from the Partner Portal via blood-lyn-sync.
        const { data, error } = await supabase
          .from("diagnostic_centers")
          .select("delivery_fee_rules")
          .eq("id", labId)
          .maybeSingle();

        if (!active) return;

        if (error || !data) {
          console.log("[useCollectionFee] No data returned from diagnostic_centers for labId:", labId);
          setCollectionFee(0);
          setLoading(false);
          return;
        }

        const rules = data.delivery_fee_rules as DeliveryFeeRule[] | null;
        console.log("[useCollectionFee] Fetched rules:", rules);

        if (!rules || !Array.isArray(rules) || rules.length === 0) {
          console.log("[useCollectionFee] Rules array is empty or invalid");
          setCollectionFee(0);
          setLoading(false);
          return;
        }

        // Find the applicable rule for the given subtotal
        const applicableRule = rules.find((rule) => {
          const meetsMin = subtotal >= rule.min_mrp;
          const meetsMax = rule.max_mrp === null || rule.max_mrp === undefined || subtotal <= rule.max_mrp;
          return meetsMin && meetsMax;
        });

        if (applicableRule) {
          console.log("[useCollectionFee] Found applicable rule:", applicableRule);
          setCollectionFee(Number(applicableRule.fee) || 0);
        } else {
          console.log("[useCollectionFee] No applicable rule found for subtotal", subtotal);
          setCollectionFee(0);
        }
      } catch (error) {
        console.error("[useCollectionFee] Error fetching collection fee:", error);
        if (active) setCollectionFee(0);
      } finally {
        if (active) setLoading(false);
      }
    }

    setLoading(true);
    fetchFee();

    return () => {
      active = false;
    };
  }, [labId, subtotal]);

  return { collectionFee, loading };
}
