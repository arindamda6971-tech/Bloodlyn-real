import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Platform charge for Lab Tests (Home Collection).
 *
 * Source of truth: the Admin app's Finance & Revenue → Commission Engine
 * ("Lab Tests (Home Collection)" percentage), read through the existing
 * bridge-proxy edge function (endpoint: `bridge-settings`).
 *
 * If the admin endpoint is unavailable, we fall back to the last known value
 * (cached locally) and finally to DEFAULT_LAB_TEST_FEE_PERCENT so checkout
 * never breaks.
 */
export const DEFAULT_LAB_TEST_FEE_PERCENT = 10;

const CACHE_KEY = "BloodLyn_platform_fee_percent";

const readCache = (): number | null => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const n = raw === null ? NaN : Number(raw);
    return Number.isFinite(n) && n >= 0 && n <= 50 ? n : null;
  } catch {
    return null;
  }
};

const writeCache = (percent: number) => {
  try {
    localStorage.setItem(CACHE_KEY, String(percent));
  } catch {
    // ignore storage failures
  }
};

const parsePercent = (payload: unknown): number | null => {
  if (!payload || typeof payload !== "object") return null;
  const obj = payload as Record<string, unknown>;
  const raw =
    obj.lab_test_commission_percent ??
    obj.labTestCommissionPercent ??
    obj.lab_test_fee_percent ??
    (typeof obj.settings === "object" && obj.settings !== null
      ? (obj.settings as Record<string, unknown>).lab_test_commission_percent
      : undefined);
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 && n <= 50 ? n : null;
};

export const usePlatformFeePercent = () => {
  const { data } = useQuery({
    queryKey: ["platform-fee-percent"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("bridge-proxy", {
        body: { endpoint: "bridge-settings", method: "GET" },
      });
      if (error) throw error;
      const percent = parsePercent(data);
      if (percent === null) throw new Error("Invalid platform fee response");
      writeCache(percent);
      return percent;
    },
    staleTime: 1000 * 60 * 10,
    retry: 1,
    placeholderData: readCache() ?? DEFAULT_LAB_TEST_FEE_PERCENT,
  });

  return data ?? readCache() ?? DEFAULT_LAB_TEST_FEE_PERCENT;
};

/** Platform charge in rupees, rounded to the nearest rupee. */
export const calcPlatformFee = (amount: number, percent: number) =>
  Math.max(0, Math.round((amount * percent) / 100));
