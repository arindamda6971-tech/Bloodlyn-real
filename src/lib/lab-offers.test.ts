import { describe, it, expect } from "vitest";
import {
  activeLabOffers,
  describeLabOffer,
  indiaToday,
  normalizeLabOffers,
  offerApplies,
  offerSavings,
  type LabOffer,
} from "../../supabase/functions/_shared/lab-offers";

const offer = (over: Partial<LabOffer> & { is_active?: boolean } = {}) => ({
  id: "o1",
  type: "percentage_discount",
  min_order_amount: 500,
  discount_value: 10,
  max_discount_cap: 150,
  start_date: "2026-11-01",
  end_date: "2026-11-30",
  ...over,
});

describe("Lab offers (checkout and create-order share these)", () => {
  it("drops anything malformed or switched off", () => {
    expect(normalizeLabOffers(null)).toEqual([]);
    expect(normalizeLabOffers([offer({ is_active: false })])).toEqual([]);
    expect(normalizeLabOffers([offer({ discount_value: 150 })])).toEqual([]); // over 100%
    expect(normalizeLabOffers([offer({ type: "flat_discount", discount_value: 0 })])).toEqual([]);
    expect(normalizeLabOffers([offer({ end_date: "2026-10-01" })])).toEqual([]); // ends before it starts
    expect(normalizeLabOffers([{ ...offer(), type: "bogus" }])).toEqual([]);
    expect(normalizeLabOffers([offer({ id: "" })])).toEqual([]);
    expect(normalizeLabOffers([offer()])).toHaveLength(1);
  });

  it("only runs between its start and end dates, both included", () => {
    const list = [offer()];
    expect(activeLabOffers(list, "2026-10-31")).toEqual([]);
    expect(activeLabOffers(list, "2026-11-01")).toHaveLength(1);
    expect(activeLabOffers(list, "2026-11-30")).toHaveLength(1);
    expect(activeLabOffers(list, "2026-12-01")).toEqual([]);
  });

  it("uses the India date, so a late-evening order counts as that day", () => {
    // 19:00 UTC on 30 Nov is 00:30 IST on 1 Dec.
    expect(indiaToday(new Date("2026-11-30T19:00:00Z"))).toBe("2026-12-01");
    expect(indiaToday(new Date("2026-11-30T10:00:00Z"))).toBe("2026-11-30");
  });

  it("needs the order to reach the minimum", () => {
    const [o] = normalizeLabOffers([offer()]);
    expect(offerApplies(o, 499)).toBe(false);
    expect(offerApplies(o, 500)).toBe(true);
    expect(offerSavings(o, 499)).toEqual({ discount: 0, freeCollection: false });
  });

  it("works out percentage, flat and free-collection savings", () => {
    const [pct] = normalizeLabOffers([offer()]);
    expect(offerSavings(pct, 1000).discount).toBe(100);
    expect(offerSavings(pct, 5000).discount).toBe(150); // capped
    const [flat] = normalizeLabOffers([offer({ type: "flat_discount", discount_value: 200, max_discount_cap: null })]);
    expect(offerSavings(flat, 800)).toEqual({ discount: 200, freeCollection: false });
    const [free] = normalizeLabOffers([offer({ type: "free_delivery", discount_value: 0, min_order_amount: 0 })]);
    expect(offerSavings(free, 300)).toEqual({ discount: 0, freeCollection: true });
  });

  it("never takes off more than the order", () => {
    const [flat] = normalizeLabOffers([offer({ type: "flat_discount", discount_value: 900, min_order_amount: 0 })]);
    expect(offerSavings(flat, 600).discount).toBe(600);
  });

  it("describes each offer for patients", () => {
    const [pct, flat, free] = normalizeLabOffers([
      offer(),
      offer({ id: "o2", type: "flat_discount", discount_value: 100, max_discount_cap: null }),
      offer({ id: "o3", type: "free_delivery", min_order_amount: 0, discount_value: 0 }),
    ]);
    expect(describeLabOffer(pct)).toBe("10% off on orders of ₹500 or more (up to ₹150)");
    expect(describeLabOffer(flat)).toBe("₹100 off on orders of ₹500 or more");
    expect(describeLabOffer(free)).toBe("Free home collection");
  });
});
