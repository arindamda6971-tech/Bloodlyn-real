import { describe, it, expect } from "vitest";
import { doctorCartId, doctorsFromDirectory } from "./doctor-directory";

const partnerRow = {
  id: "doc-uuid-1",
  name: "Dr. Ananya Sen",
  specialty: "General Physician",
  qualification: "MBBS",
  experience: 6,
  consultation_fee: 400,
  videoCallFee: null,
  audioCallFee: null,
  physicalCallFee: null,
  available: true,
  photo: "https://example.test/a.jpg",
  clinicName: "Sen Clinic",
  clinicAddress: "Station Road, Belda 721424",
};

describe("doctor directory", () => {
  it("shapes a partner doctor without inventing anything", () => {
    const [d] = doctorsFromDirectory({ doctors: [partnerRow] });
    expect(d.videoCallFee).toBe(400);
    expect(d.audioCallFee).toBe(400);
    expect(d.physicalCallFee).toBe(400);
    expect(d.image).toBe("https://example.test/a.jpg");
    expect(d.hospitalName).toBe("Sen Clinic");
    expect(d.pincode).toBe("721424");
    expect(d.rating).toBe(0);
    expect(d.reviews).toBe(0);
  });

  it("offers no clinic visit to an online-only doctor and no mode without a fee", () => {
    const [d] = doctorsFromDirectory({ doctors: [{ ...partnerRow, clinicName: null, clinicAddress: null, consultation_fee: null, videoCallFee: 300 }] });
    expect(d.physicalCallFee).toBe(0);
    expect(d.audioCallFee).toBe(0);
    expect(d.videoCallFee).toBe(300);
  });

  it("leaves out doctors who aren't accepting consultations, and unusable rows", () => {
    const list = doctorsFromDirectory({ doctors: [{ ...partnerRow, available: false }, { name: "No id" }, partnerRow] });
    expect(list.map((d) => d.id)).toEqual(["doc-uuid-1"]);
    expect(doctorsFromDirectory({ error: "Unauthorized" })).toEqual([]);
  });

  it("builds the cart id create-order understands", () => {
    expect(doctorCartId("video", "abc")).toBe("doc-video-abc");
    expect(doctorCartId("audio", "abc")).toBe("doc-audio-abc");
    expect(doctorCartId("physical", "abc")).toBe("doc-abc");
  });
});
