import { describe, it, expect } from "vitest";
import { doctorsFromDirectory } from "@/lib/doctor-directory";

const doctor = (extra: Record<string, unknown> = {}) => ({
  id: "doc-1",
  name: "Dr Ar Das",
  specialty: "Family Medicine",
  consultation_fee: 400,
  available: true,
  ...extra,
});

describe("Doctors in the app (instant consultations)", () => {
  it("marks a doctor whose daily limit is reached as fully booked today", () => {
    const [full] = doctorsFromDirectory({ doctors: [doctor({ dailyLimit: 5, fullToday: true })] });
    expect(full.fullToday).toBe(true);
    const [open] = doctorsFromDirectory({ doctors: [doctor({ dailyLimit: 5, fullToday: false })] });
    expect(open.fullToday).toBe(false);
  });

  it("hides a doctor who switched off Accepting consultations", () => {
    expect(doctorsFromDirectory({ doctors: [doctor({ available: false })] })).toHaveLength(0);
  });

  it("doesn't make up languages the doctor never gave", () => {
    const [d] = doctorsFromDirectory({ doctors: [doctor()] });
    expect(d.languages).toEqual([]);
    const [b] = doctorsFromDirectory({ doctors: [doctor({ languages: ["Bengali", "English"] })] });
    expect(b.languages).toEqual(["Bengali", "English"]);
  });
});
