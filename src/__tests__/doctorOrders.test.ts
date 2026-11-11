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
});
