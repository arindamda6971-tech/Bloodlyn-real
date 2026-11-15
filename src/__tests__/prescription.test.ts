import { describe, it, expect } from "vitest";
import { medicineLine, prescriptionCartItems, prescriptionOf, testTitle } from "@/lib/prescription";

const order = {
  prescription: {
    issued_at: "2026-11-15T10:00:00Z",
    doctor_name: "Dr. A Sen",
    diagnosis: "Viral fever",
    medicines: [{ name: "Paracetamol 650", dosage: "1 tablet", frequency: "Three times a day", duration: "5 days", instructions: "" }, { name: "" }],
    tests: [
      { id: "17452ffd-aade-4009-9017-cd7a0cc1eb7c", name: "COMPLETE BLOOD COUNT" },
      { id: null, name: "VITAMIN  D  SCREEN\n*Calcium *Vitamin D 25 Hydroxy" },
    ],
  },
};

describe("prescription on a consultation", () => {
  it("reads the prescription and skips unusable rows", () => {
    const rx = prescriptionOf(order)!;
    expect(rx.diagnosis).toBe("Viral fever");
    expect(rx.medicines).toHaveLength(1);
    expect(medicineLine(rx.medicines[0])).toBe("1 tablet · Three times a day · 5 days");
    expect(testTitle(rx.tests[1])).toBe("VITAMIN  D  SCREEN");
  });

  it("has no prescription when there isn't one", () => {
    expect(prescriptionOf({})).toBeNull();
    expect(prescriptionOf({ prescription: "text" })).toBeNull();
    expect(prescriptionOf(null)).toBeNull();
  });

  it("turns the advised tests into cart items without a lab yet", () => {
    const items = prescriptionCartItems(prescriptionOf(order)!);
    expect(items[0]).toEqual({ id: "17452ffd-aade-4009-9017-cd7a0cc1eb7c", name: "COMPLETE BLOOD COUNT", price: 0, kind: "test", category: "Prescribed by your doctor" });
    expect(items[1].id).toBe("rx-1-vitamin-d-screen");
    expect(items.every((i) => !("labId" in i))).toBe(true);
  });
});
