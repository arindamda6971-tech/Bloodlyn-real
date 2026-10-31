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
import { TestFacts } from "@/components/tests/TestFacts";
import { reportTimeLabel, reportTypeLabel, testInfo, testRequirements } from "@/lib/test-details";
import { scaledSize, compressImage } from "@/lib/compress-image";

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
import { validatePrescriptionFile } from "@/lib/order-prescription";

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

  it("picks up fasting and sample details the lab changed", () => {
    const rules = rulesFromProducts([rule({ fasting_required: true, fasting_instruction: "10 hours", sample_type: "Blood" })]);
    expect(applyLiveRules([{ name: "Biopsy", availabilityType: "GENERAL" }], rules)[0]).toMatchObject({
      fastingRequired: true,
      fastingInstruction: "10 hours",
      sampleType: "Blood",
    });
  });

  it("drops an old fasting instruction once the lab removes it", () => {
    const old = { name: "Biopsy", availabilityType: "GENERAL", fastingRequired: true, fastingInstruction: "10 hours" };
    const [item] = applyLiveRules([old], rulesFromProducts([rule()]));
    expect(item.fastingRequired).toBe(false);
    expect(item.fastingInstruction).toBeUndefined();
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

describe("test facts", () => {
  const full = {
    availabilityType: "SPECIALIZED",
    availableDays: ["Saturday", "Friday"],
    sampleType: "Blood",
    reportType: "NABL",
    fastingRequired: true,
    fastingInstruction: "Don't eat for 10 hours",
    preparationRequired: true,
    preparationInstruction: "Bring first morning urine",
    prescriptionRequired: true,
  };

  it("keeps what the patient must do apart from what's useful to know", () => {
    expect(testRequirements(full)).toEqual(["Prescription required", "Fasting needed", "Preparation needed"]);
    expect(testInfo(full)).toEqual(["Fri, Sat", "Blood", "NABL report"]);
  });

  it("never shows the stored report codes", () => {
    expect(reportTypeLabel("NABL")).toBe("NABL report");
    expect(reportTypeLabel("NORMAL")).toBe("Lab report");
    expect(reportTypeLabel("")).toBeNull();
  });

  it("says when the report will be ready, in hours or days", () => {
    expect(reportTimeLabel("24")).toBe("Report in 24 hours");
    expect(reportTimeLabel("1")).toBe("Report in 1 hour");
    expect(reportTimeLabel("3 days")).toBe("Report in 3 days");
    expect(reportTimeLabel("")).toBeNull();
    expect(testInfo({ reportType: "NORMAL", reportTime: "3 days" })).toEqual(["Lab report", "Report in 3 days"]);
  });

  it("doesn't mention days for a test run every day", () => {
    expect(testInfo({ availabilityType: "GENERAL", sampleType: "Urine" })).toEqual(["Urine"]);
  });

  it("uses lines of text, with no tags to overlap", () => {
    const { container } = render(<TestFacts test={full} />);
    expect(container.querySelectorAll("[data-fact-line]")).toHaveLength(2);
    expect(screen.getByText("Prescription required")).toBeInTheDocument();
    expect(screen.getByText("Fri, Sat")).toBeInTheDocument();
    expect(container).not.toHaveTextContent("Don't eat");
  });

  it("gives the lab's wording in the cart without saying it twice", () => {
    const { container } = render(<TestFacts test={full} withInstructions />);
    expect(container).toHaveTextContent("Fasting: Don't eat for 10 hours");
    expect(container).toHaveTextContent("Preparation: Bring first morning urine");
    expect(container).not.toHaveTextContent("Fasting needed");
    expect(container).toHaveTextContent("Prescription required");
  });

  it("still says fasting is needed when the lab gave no wording", () => {
    const { container } = render(<TestFacts test={{ fastingRequired: true }} withInstructions />);
    expect(container).toHaveTextContent("Fasting needed");
  });

  it("draws nothing when there's nothing to say", () => {
    const { container } = render(<TestFacts test={{ availabilityType: "GENERAL" }} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("shrinking prescription photos", () => {
  it("fits the long side to 1600 px and keeps the shape", () => {
    expect(scaledSize(4000, 3000)).toEqual({ width: 1600, height: 1200 });
    expect(scaledSize(3000, 4000)).toEqual({ width: 1200, height: 1600 });
  });

  it("never enlarges a small photo", () => {
    expect(scaledSize(800, 600)).toEqual({ width: 800, height: 600 });
  });

  it("leaves PDFs and already small photos alone", async () => {
    const pdf = new File([new Uint8Array(1024 * 1024)], "rx.pdf", { type: "application/pdf" });
    const small = new File([new Uint8Array(1024)], "rx.jpg", { type: "image/jpeg" });
    await expect(compressImage(pdf)).resolves.toBe(pdf);
    await expect(compressImage(small)).resolves.toBe(small);
  });

  it("uploads the original rather than failing when a photo can't be read", async () => {
    vi.stubGlobal("createImageBitmap", vi.fn(async () => { throw new Error("HEIC not supported"); }));
    const heic = new File([new Uint8Array(2 * 1024 * 1024)], "rx.heic", { type: "image/heic" });
    await expect(compressImage(heic)).resolves.toBe(heic);
    vi.unstubAllGlobals();
  });
});

describe("prescription file limits", () => {
  const sized = (mb: number, name: string, type: string) => {
    const file = new File(["x"], name, { type });
    Object.defineProperty(file, "size", { value: mb * 1024 * 1024 });
    return file;
  };

  it("lets a large phone photo through, since it gets shrunk", () => {
    expect(validatePrescriptionFile(sized(15, "rx.jpg", "image/jpeg"))).toBeNull();
  });

  it("limits PDFs to 5 MB, as they can't be shrunk", () => {
    expect(validatePrescriptionFile(sized(4, "rx.pdf", "application/pdf"))).toBeNull();
    expect(validatePrescriptionFile(sized(6, "rx.pdf", "application/pdf"))).toContain("5MB");
  });

  it("refuses other file types", () => {
    expect(validatePrescriptionFile(sized(1, "rx.docx", "application/msword"))).toContain("Only JPG");
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
