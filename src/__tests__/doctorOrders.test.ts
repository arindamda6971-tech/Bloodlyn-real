import { describe, it, expect } from "vitest";
import { consultInfo, consultStatus, isDoctorOrder } from "@/lib/doctor-orders";

describe("doctor orders", () => {
  it("reads mode, doctor and patient from the consult name", () => {
    expect(consultInfo({ test_name: "Audio Call with Dr Ar Das (Pk)" })).toEqual({ mode: "audio", doctorName: "Dr Ar Das", patientName: "Pk" });
    expect(consultInfo({ test_name: "Video Call with Dr Rina Sen (Self)" })?.mode).toBe("video");
    expect(consultInfo({ test_name: "Physical Appointment with Dr Rina Sen (Self)" })?.mode).toBe("clinic");
  });

  it("leaves lab, ECG and BP orders alone", () => {
    expect(isDoctorOrder({ test_name: "CBC Haemogram, EDTA Blood" })).toBe(false);
    expect(isDoctorOrder({ test_name: "At-home ECG", order_number: "ECG-1" })).toBe(false);
    expect(isDoctorOrder({ test_name: "Home BP check" })).toBe(false);
  });

  it("groups statuses as upcoming, completed or cancelled", () => {
    expect(consultStatus("confirmed")).toBe("upcoming");
    expect(consultStatus("completed")).toBe("completed");
    expect(consultStatus("cancelled")).toBe("cancelled");
  });

  it("calls an open booking missed once its day in India has passed", () => {
    // 20:00 UTC on the 12th is already the 13th in India.
    const now = new Date("2026-11-12T20:00:00Z");
    expect(consultStatus("confirmed", "2026-11-13", now)).toBe("upcoming");
    expect(consultStatus("confirmed", "2026-11-12", now)).toBe("missed");
    expect(consultStatus("completed", "2026-11-01", now)).toBe("completed");
    expect(consultStatus("cancelled", "2026-11-01", now)).toBe("cancelled");
    expect(consultStatus("confirmed", null, now)).toBe("upcoming");
  });
});
