export interface DeliveryFeeRule {
  min_mrp: number;
  max_mrp: number | null;
  fee: number;
  is_active?: boolean;
}

const asFiniteNonNegative = (value: unknown): number | null => {
  const parsed = typeof value === "number" || typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

export const normalizeDeliveryFeeRules = (value: unknown): DeliveryFeeRule[] => {
  if (!Array.isArray(value)) return [];

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const row = entry as Record<string, unknown>;
    const min = asFiniteNonNegative(row.min_mrp);
    const max = row.max_mrp == null ? null : asFiniteNonNegative(row.max_mrp);
    const fee = asFiniteNonNegative(row.fee);
    if (row.is_active === false || min === null || fee === null || (max !== null && max < min)) return [];
    return [{ min_mrp: min, max_mrp: max, fee, is_active: true }];
  });
};

/**
 * Partner rules may overlap. Prefer the narrowest matching range, then the
 * highest lower bound, so a more specific rule always beats a broad fallback.
 */
export const calculateDeliveryFee = (value: unknown, mrpTotal: number): number => {
  if (!Number.isFinite(mrpTotal) || mrpTotal < 0) return 0;

  const matches = normalizeDeliveryFeeRules(value)
    .filter((rule) => mrpTotal >= rule.min_mrp && (rule.max_mrp === null || mrpTotal <= rule.max_mrp))
    .sort((a, b) => {
      const aWidth = a.max_mrp === null ? Number.POSITIVE_INFINITY : a.max_mrp - a.min_mrp;
      const bWidth = b.max_mrp === null ? Number.POSITIVE_INFINITY : b.max_mrp - b.min_mrp;
      return aWidth - bWidth || b.min_mrp - a.min_mrp;
    });

  return matches[0]?.fee ?? 0;
};