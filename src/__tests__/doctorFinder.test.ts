import { describe, it, expect } from "vitest";
import type { Doctor } from "@/types/consultation";
import {
  defaultType,
  doctorInitials,
  doctorName,
  feeFor,
  findDoctors,
  specialtiesWithDoctors,
  specialtyOf,
} from "@/lib/doctor-finder";
import { consultProgress } from "@/lib/doctor-orders";
import { bookingReason } from "@/lib/doctor-booking";

const doc = (over: Partial<Doctor>): Doctor => ({
  id: over.name ?? "d",
  name: "Dr Test",
  specialty: "",
  experience: 0,
  rating: 0,
  reviews: 0,
  available: true,
  nextSlot: "",
  videoCallFee: 0,
  audioCallFee: 0,
  physicalCallFee: 0,
  qualification: "",
  ...over,
});

const gp = doc({ name: "Dr Ar Das", specialty: "Family Medicine", qualification: "MBBS", experience: 2, videoCallFee: 400, audioCallFee: 300, physicalCallFee: 500 });
const skin = doc({ name: "Dr Rupa Sen", specialty: "Dermatologist", qualification: "MBBS, MD", experience: 9, videoCallFee: 700 });
const kids = doc({ name: "Dr K Paul", specialty: "Paediatrics", experience: 15, audioCallFee: 350, rating: 4.6, reviews: 12 });
const clinicOnly = doc({ name: "Dr Bose", specialty: "Orthopaedic surgeon", physicalCallFee: 600, city: "Belda" });
const all = [gp, skin, kids, clinicOnly];

describe("finding a doctor", () => {
  it("reads the specialty from what the doctor wrote, the specific one winning", () => {
    expect(specialtyOf(gp)?.key).toBe("general");
    expect(specialtyOf(skin)?.key).toBe("skin");
    expect(specialtyOf(kids)?.key).toBe("child");
    expect(specialtyOf(clinicOnly)?.key).toBe("bones");
    expect(specialtyOf(doc({ specialty: "Senior Resident", qualification: "MBBS" }))?.key).toBe("general");
    expect(specialtyOf(doc({ specialty: "Heart specialist" }))?.key).toBe("heart");
  });

  it("shows online doctors by default, and clinic doctors in clinic mode", () => {
    expect(findDoctors(all, { mode: "online" }).doctors.map((d) => d.name)).not.toContain("Dr Bose");
    expect(findDoctors(all, { mode: "clinic" }).doctors.map((d) => d.name)).toEqual(["Dr Ar Das", "Dr Bose"]);
  });

  it("lists rated doctors first, then by experience; or by fee", () => {
    expect(findDoctors(all, { mode: "online" }).doctors.map((d) => d.name)).toEqual(["Dr K Paul", "Dr Rupa Sen", "Dr Ar Das"]);
    expect(findDoctors(all, { mode: "online", sort: "fee" }).doctors.map((d) => d.name)).toEqual(["Dr Ar Das", "Dr K Paul", "Dr Rupa Sen"]);
  });

  it("filters by specialty and by search words", () => {
    expect(findDoctors(all, { mode: "online", specialty: "skin" }).doctors).toEqual([skin]);
    expect(findDoctors(all, { mode: "online", search: "family das" }).doctors).toEqual([gp]);
    expect(findDoctors(all, { mode: "clinic", search: "belda" }).doctors).toEqual([clinicOnly]);
  });

  it("takes a problem to its specialty, and says so when it falls back", () => {
    const rash = findDoctors(all, { mode: "online", problem: "skin" });
    expect(rash.doctors).toEqual([skin]);
    expect(rash.fallbackFrom).toBeNull();

    const stomach = findDoctors(all, { mode: "online", problem: "stomach" });
    expect(stomach.doctors).toEqual([gp]);
    expect(stomach.fallbackFrom?.key).toBe("stomach");

    expect(findDoctors(all, { mode: "online", problem: "tooth" }).doctors).toEqual([]);
  });

  it("counts doctors per specialty for the chips", () => {
    expect(specialtiesWithDoctors(all, "online").map((s) => [s.key, s.count])).toEqual([["general", 1], ["skin", 1], ["child", 1]]);
  });

  it("quotes the cheaper online fee, and starts with video when offered", () => {
    expect(feeFor(gp, "online")).toBe(300);
    expect(feeFor(gp, "clinic")).toBe(500);
    expect(defaultType(gp, "online")).toBe("video");
    expect(defaultType(kids, "online")).toBe("audio");
    expect(defaultType(gp, "clinic")).toBe("physical");
  });

  it("writes names and initials once", () => {
    expect(doctorName("Ar Das")).toBe("Dr Ar Das");
    expect(doctorName("Dr. Ar Das")).toBe("Dr. Ar Das");
    expect(doctorInitials("Dr Ar Das")).toBe("AD");
    expect(doctorInitials("Rupa")).toBe("R");
  });
});

describe("booking reason", () => {
  it("joins problems, note and health details", () => {
    expect(bookingReason(["Fever"], "", { bp: "", sugar: "", medicines: "" })).toBe("Fever");
    expect(bookingReason(["Fever", "Headache"], " 3 days ", { bp: "130/85", sugar: "140", medicines: "Metformin" })).toBe(
      "Fever, Headache. 3 days, BP 130/85, Sugar 140, Medicines: Metformin",
    );
    expect(bookingReason([], "", { bp: "", sugar: "", medicines: "" })).toBe("");
  });
});

describe("consultation tracker", () => {
  const now = new Date("2026-11-16T06:00:00Z");
  const states = (o: Parameters<typeof consultProgress>[0], mode: "video" | "clinic" = "video") =>
    consultProgress(o, mode, now)?.map((s) => `${s.key}:${s.state}`).join(" ");

  it("follows an online consultation from booking to prescription", () => {
    const booked = { status: "confirmed", scheduled_date: "2026-11-16" };
    expect(states(booked)).toBe("booked:done call:current consult:todo prescription:todo");
    expect(states({ ...booked, meet_link: "https://meet.google.com/abc-defg-hij", call_status: "in_progress" })).toBe(
      "booked:done call:done consult:current prescription:todo",
    );
    expect(states({ ...booked, meet_link: "https://meet.google.com/abc-defg-hij", call_status: "ended" })).toBe(
      "booked:done call:done consult:done prescription:current",
    );
    expect(states({ ...booked, status: "completed", prescription: { tests: [] } })).toBe("booked:done call:done consult:done prescription:done");
  });

  it("has three steps for a clinic visit", () => {
    expect(states({ status: "confirmed", scheduled_date: "2026-11-17" }, "clinic")).toBe("booked:done visit:current prescription:todo");
  });

  it("has no tracker for a cancelled or missed booking", () => {
    expect(consultProgress({ status: "cancelled" }, "video", now)).toBeNull();
    expect(consultProgress({ status: "confirmed", scheduled_date: "2026-11-10" }, "video", now)).toBeNull();
  });
});
