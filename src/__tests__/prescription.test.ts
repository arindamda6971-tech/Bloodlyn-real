import { describe, it, expect } from "vitest";
import { medicineLine, prescriptionOf, testTitle } from "@/lib/prescription";
import { labCartItems, labOptionFor, labOptionsForPrescription } from "@/lib/prescriptionLabs";

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
});

describe("choosing a lab for the prescribed tests", () => {
  const tests = prescriptionOf(order)!.tests;
  const product = (vendor_id: string, name: string, price: number, extra = {}) => ({ vendor_id, name, product_name: name, price, ...extra });

  it("prices each test from the lab's own products, its price list winning", () => {
    const option = labOptionFor(
      tests,
      { id: "lab-1", name: "Sen Diagnostics", vendor_id: "v1", pricing: { "Vitamin D Screen": 900 } },
      [product("v1", "Complete Blood Count", 350, { fasting_required: false }), product("v1", "Vitamin D Screen", 1200)],
    )!;
    expect(option.missing).toEqual([]);
    expect(option.matches.map((m) => [m.name, m.price])).toEqual([["Complete Blood Count", 350], ["Vitamin D Screen", 900]]);
    expect(option.total).toBe(1250);
    expect(option.noCommonDay).toBe(false);
  });

  it("names what a lab doesn't do, and skips tests it has no price for", () => {
    const option = labOptionFor(tests, { id: "lab-2", name: "Lab Two", available_tests: [{ test_name: "Complete Blood Count", price: 0 }, "Vitamin D Screen"] }, [
      product("v2", "Complete Blood Count", 300),
    ]);
    expect(option!.matches.map((m) => m.name)).toEqual(["Complete Blood Count"]);
    expect(option!.missing.map((t) => t.name)).toEqual([tests[1].name]);
    expect(labOptionFor(tests, { id: "lab-3", name: "Lab Three", available_tests: ["Lipid Profile"] })).toBeNull();
  });

  it("lists labs with every test first, otherwise keeping their order", () => {
    const labs = [
      { id: "a", name: "A", vendor_id: "va" },
      { id: "b", name: "B", vendor_id: "vb" },
      { id: "c", name: "C", vendor_id: "vc" },
    ];
    const products = {
      va: [product("va", "Complete Blood Count", 300)],
      vb: [product("vb", "Complete Blood Count", 320), product("vb", "Vitamin D Screen", 1000)],
    };
    expect(labOptionsForPrescription(tests, labs, products).map((o) => o.lab.id)).toEqual(["b", "a"]);
  });

  it("can't book specialized tests that share no collection day", () => {
    const option = labOptionFor(tests, { id: "d", name: "D", vendor_id: "vd" }, [
      product("vd", "Complete Blood Count", 300, { availability_type: "SPECIALIZED", available_days: ["Monday"] }),
      product("vd", "Vitamin D Screen", 900, { availability_type: "SPECIALIZED", available_days: ["Tuesday"] }),
    ])!;
    expect(option.noCommonDay).toBe(true);
  });

  it("puts the chosen lab's tests in the cart, priced and tied to that lab", () => {
    const option = labOptionFor(tests, { id: "lab-1", name: "Sen Diagnostics", vendor_id: "v1" }, [
      product("v1", "Complete Blood Count", 350),
      product("v1", "Vitamin D Screen", 900),
    ])!;
    const items = labCartItems(option);
    expect(items[0]).toMatchObject({ id: "17452ffd-aade-4009-9017-cd7a0cc1eb7c", name: "Complete Blood Count", price: 350, labId: "lab-1", labName: "Sen Diagnostics", vendorId: "v1", kind: "test" });
    expect(items[1]).toMatchObject({ id: "rx-1-vitamin-d-screen", price: 900, labId: "lab-1" });
  });
});
