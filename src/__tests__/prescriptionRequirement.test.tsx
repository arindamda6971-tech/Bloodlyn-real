import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { readFileSync } from "fs";
import {
  applyLiveRules,
  fetchLiveTestRules,
  prescriptionTestsFrom,
  rulesFromProducts,
} from "@/lib/prescription-requirement";
import { getCommonSpecializedDays } from "@/lib/test-availability";
import { PrescriptionUpload } from "@/components/booking/PrescriptionUpload";

const db = vi.hoisted(() => ({
  products: [] as { name: string | null; product_name: string | null; vendor_id: string }[],
  labs: [] as { id: string; vendor_id: string }[],
  productFilters: [] as string[][],
}));
const upload = vi.hoisted(() => vi.fn());

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      const q: any = {
        select: () => q,
        eq: () => q,
        in: (_: string, values: string[]) => {
          if (table === "diagnostic_centers") {
            return Promise.resolve({ data: db.labs.filter((lab) => values.includes(lab.id)), error: null });
          }
          db.productFilters.push(values);
          return q;
        },
        then: (ok: any) => {
          const ids = db.productFilters[db.productFilters.length - 1] ?? [];
          return Promise.resolve({ data: db.products.filter((p) => ids.includes(p.vendor_id)), error: null }).then(ok);
        },
      };
      return q;
    },
  },
}));
vi.mock("@/lib/order-prescription", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/order-prescription")>()),
  uploadPrescription: upload,
  deletePrescription: vi.fn(),
}));

const VENDOR = "11111111-1111-1111-1111-111111111111";
const OTHER_VENDOR = "22222222-2222-2222-2222-222222222222";
const LAB = "33333333-3333-3333-3333-333333333333";

const rule = (over: Record<string, unknown> = {}) => ({ name: "Biopsy", product_name: "Biopsy", availability_type: "GENERAL", available_days: null, prescription_required: false, ...over });

describe("which tests need a prescription", () => {
  const flagged = rulesFromProducts([rule({ name: "biopsy panel", product_name: null, prescription_required: true })]);

  it("matches the cart against the lab's rules, ignoring case and spaces", () => {
    expect(prescriptionTestsFrom([{ name: " Biopsy Panel " }, { name: "CBC" }], flagged)).toEqual([" Biopsy Panel "]);
  });

  it("checks both the product's name fields", () => {
    const rules = rulesFromProducts([rule({ name: null, product_name: "BIOPSY", prescription_required: true })]);
    expect(prescriptionTestsFrom([{ name: "Biopsy" }], rules)).toEqual(["Biopsy"]);
  });

  it("doesn't apply to health packages, or before the rules have loaded", () => {
    expect(prescriptionTestsFrom([{ name: "Biopsy Panel", kind: "package" }], flagged)).toEqual([]);
    expect(prescriptionTestsFrom([{ name: "Biopsy Panel" }], undefined)).toEqual([]);
  });

  describe("from the database", () => {
    beforeEach(() => {
      db.productFilters = [];
      db.labs = [{ id: LAB, vendor_id: VENDOR }];
      db.products = [{ ...rule({ prescription_required: true }), vendor_id: VENDOR }] as typeof db.products;
    });

    const needs = async (items: Parameters<typeof fetchLiveTestRules>[0], vendorId?: string) =>
      prescriptionTestsFrom(items, await fetchLiveTestRules(items, vendorId));

    it("uses the chosen lab, so another lab's rule doesn't apply", async () => {
      await expect(needs([{ name: "Biopsy" }], VENDOR)).resolves.toEqual(["Biopsy"]);
      await expect(needs([{ name: "Biopsy" }], OTHER_VENDOR)).resolves.toEqual([]);
    });

    it("finds the lab from the cart item when it has no vendor id", async () => {
      await expect(needs([{ name: "Biopsy", labId: LAB }])).resolves.toEqual(["Biopsy"]);
    });

    it("needs no answer yet when the cart has no lab or a service instead of a lab", async () => {
      await expect(needs([{ name: "Biopsy" }])).resolves.toEqual([]);
      await expect(needs([{ name: "Consult", labId: "doctor-service" }])).resolves.toEqual([]);
      expect(db.productFilters).toEqual([]);
    });
  });
});

describe("a lab changes a test's days after it's in the cart", () => {
  const stale = { name: "Biopsy", availabilityType: "SPECIALIZED", availableDays: ["Wednesday", "Thursday"] };

  it("stops limiting booking days once the lab runs it every day", () => {
    const [item] = applyLiveRules([stale], rulesFromProducts([rule()]));
    expect(item.availabilityType).toBe("GENERAL");
    expect(item.availableDays).toBeUndefined();
    expect(getCommonSpecializedDays([item])).toBeNull();
  });

  it("picks up new days when the lab moves it to selected days", () => {
    const general = { name: "Biopsy", availabilityType: "GENERAL" };
    const rules = rulesFromProducts([rule({ availability_type: "SPECIALIZED", available_days: ["Friday"] })]);
    expect(applyLiveRules([general], rules)[0]).toMatchObject({ availabilityType: "SPECIALIZED", availableDays: ["Friday"] });
  });

  it("changes nothing when the cart already matches, so it isn't saved again", () => {
    const items = [{ name: "Biopsy", availabilityType: "GENERAL" }];
    expect(applyLiveRules(items, rulesFromProducts([rule()]))).toBe(items);
  });

  it("leaves tests the lab has no rule for, and packages, alone", () => {
    const items = [stale, { ...stale, name: "Package", kind: "package" }];
    expect(applyLiveRules(items, rulesFromProducts([rule({ name: "Other", product_name: "Other" })]))).toBe(items);
  });
});

describe("prescription upload card", () => {
  const attached = { url: "u", path: "p", name: "rx.pdf", size: 1024 * 1024, type: "application/pdf" };

  beforeEach(() => upload.mockReset());

  it("is optional when no test needs one", () => {
    render(<PrescriptionUpload value={null} onChange={vi.fn()} userId="u1" />);
    expect(screen.getByText("Optional")).toBeInTheDocument();
  });

  it("says it's required and names the tests", () => {
    render(<PrescriptionUpload value={null} onChange={vi.fn()} userId="u1" requiredFor={["Biopsy"]} />);
    expect(screen.getByText("Required")).toBeInTheDocument();
    expect(screen.getByText(/needs a doctor's prescription for Biopsy/)).toBeInTheDocument();
  });

  it("shows the attached file instead of asking again", () => {
    render(<PrescriptionUpload value={attached} onChange={vi.fn()} userId="u1" requiredFor={["Biopsy"]} />);
    expect(screen.getByText("Attached")).toBeInTheDocument();
    expect(screen.getByText("rx.pdf")).toBeInTheDocument();
    expect(screen.queryByText("Required")).not.toBeInTheDocument();
  });

  it("hands the uploaded file back to the booking screen", async () => {
    upload.mockResolvedValue(attached);
    const onChange = vi.fn();
    const { container } = render(<PrescriptionUpload value={null} onChange={onChange} userId="u1" requiredFor={["Biopsy"]} />);
    const file = new File(["x"], "rx.pdf", { type: "application/pdf" });
    fireEvent.change(container.querySelector("input[type=file]") as HTMLInputElement, { target: { files: [file] } });
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(attached));
  });
});

describe("create-order", () => {
  const source = readFileSync("supabase/functions/create-order/index.ts", "utf8");

  it("refuses a booking without a prescription attached to this order", () => {
    expect(source).toContain('code: "prescription_required"');
    expect(source).toContain("orderVendorId && !hasAttachedPrescription");
  });

  it("decides that before an older saved prescription can fill the gap", () => {
    expect(source.indexOf("const hasAttachedPrescription")).toBeLessThan(source.indexOf('.from("user_prescriptions")'));
  });
});
