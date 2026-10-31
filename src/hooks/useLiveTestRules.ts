import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCart } from "@/contexts/CartContext";
import { fetchLiveTestRules, prescriptionTestsFrom } from "@/lib/prescription-requirement";

/**
 * Keeps the cart in step with the lab's current rules while the patient books:
 * corrects the days saved on each test, and says which tests need a prescription.
 * Pass vendorId once a lab has been chosen. Always re-checked on opening, since
 * these screens decide what can be booked.
 */
export function useLiveTestRules(vendorId?: string | null, enabled = true) {
  const { items, refreshItemRules } = useCart();
  const { data: rules } = useQuery({
    queryKey: ["live-test-rules", vendorId ?? "", items.map((item) => `${item.labId}:${item.name}`).join("|")],
    queryFn: () => fetchLiveTestRules(items, vendorId),
    enabled: enabled && items.length > 0,
    staleTime: 0,
  });

  useEffect(() => {
    if (rules) refreshItemRules(rules);
  }, [rules, refreshItemRules]);

  const prescriptionTests = useMemo(() => prescriptionTestsFrom(items, rules), [items, rules]);
  return { prescriptionTests };
}
