import { describe, it, expect } from "vitest";
import type { Doctor } from "@/types/consultation";
import {
  SPECIALTIES,
  defaultType,
  doctorCounts,
  doctorInitials,
  doctorName,
  findDoctors,
  firstSpecialties,
  onlineFee,
  problemsFor,
  rankSpecialties,
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
  qualification: "",
  ...over,
});

const gp = doc({ name: "Dr Ar Das", specialty: "Family Medicine", qualification: "MBBS", experience: 2, videoCallFee: 400, audioCallFee: 300 });
const skin = doc({ name: "Dr Rupa Sen", specialty: "Dermatologist", qualification: "MBBS, MD", experience: 9, videoCallFee: 700 });
const kids = doc({ name: "Dr K Paul", specialty: "Paediatrics", experience: 15, audioCallFee: 350, rating: 4.6, reviews: 12 });
const noFee = doc({ name: "Dr Bose", specialty: "ENT surgeon" });
const all = [gp, skin, kids, noFee];

describe("finding a doctor", () => {
  it("has the common medical specialties, each with its own problems", () => {
    const labels = SPECIALTIES.map((s) => s.label);
    for (const l of ["General Physician", "Gynaecologist", "Paediatrician", "Dermatologist", "ENT Specialist", "Dentist", "Cardiologist", "Psychiatrist"]) {
      expect(labels).toContain(l);
    }
    expect(SPECIALTIES.every((s) => s.problems.length >= 4)).toBe(true);
    expect(new Set(SPECIALTIES.map((s) => s.key)).size).toBe(SPECIALTIES.length);
  });

  it("reads the specialty from what the doctor wrote, the specific one winning", () => {
    expect(specialtyOf(gp)?.key).toBe("general");
    expect(specialtyOf(skin)?.key).toBe("skin");
    expect(specialtyOf(kids)?.key).toBe("child");
    expect(specialtyOf(noFee)?.key).toBe("ent");
    expect(specialtyOf(doc({ specialty: "Senior Resident", qualification: "MBBS" }))?.key).toBe("general");
    expect(specialtyOf(doc({ specialty: "Neurologist" }))?.key).toBe("brain");
    expect(specialtyOf(doc({ specialty: "Obstetrics & Gynaecology" }))?.key).toBe("women");
    expect(specialtyOf(doc({ specialty: "Homeopath", qualification: "BHMS" }))?.key).toBe("homeo");
  });

  it("lists only doctors who consult online, rated first, then by experience; or by fee", () => {
    expect(findDoctors(all).map((d) => d.name)).toEqual(["Dr K Paul", "Dr Rupa Sen", "Dr Ar Das"]);
    expect(findDoctors(all, { sort: "fee" }).map((d) => d.name)).toEqual(["Dr Ar Das", "Dr K Paul", "Dr Rupa Sen"]);
  });

  it("filters by the specialty chosen and by search words", () => {
    expect(findDoctors(all, { specialty: "skin" })).toEqual([skin]);
    expect(findDoctors(all, { specialty: "teeth" })).toEqual([]);
    expect(findDoctors(all, { search: "family das" })).toEqual([gp]);
  });

  it("counts doctors per specialty for the tiles", () => {
    expect(doctorCounts(all)).toEqual({ general: 1, skin: 1, child: 1 });
  });

  it("puts the specialties with the most doctors first, three before See all", () => {
    const ranked = rankSpecialties({ ent: 4, skin: 2, heart: 2 });
    expect(ranked.slice(0, 4).map((s) => s.key)).toEqual(["ent", "skin", "heart", "general"]);
    expect(ranked).toHaveLength(SPECIALTIES.length);
    expect(firstSpecialties(ranked, null).map((s) => s.key)).toEqual(["ent", "skin", "heart"]);
    // A chosen specialty further down still shows, in the last place.
    expect(firstSpecialties(ranked, "teeth").map((s) => s.key)).toEqual(["ent", "skin", "teeth"]);
    expect(firstSpecialties(ranked, "skin").map((s) => s.key)).toEqual(["ent", "skin", "heart"]);
    // No doctors yet: the catalogue order, General Physician first.
    expect(firstSpecialties(rankSpecialties({}), null).map((s) => s.key)).toEqual(["general", "women", "child"]);
  });

  it("offers the chosen specialty's problems, else the doctor's own, else a GP's", () => {
    expect(problemsFor("ent")).toContain("Ear pain");
    expect(problemsFor(null, skin)).toContain("Hair fall");
    expect(problemsFor(null, doc({ specialty: "Something new" }))).toContain("Fever");
  });

  it("quotes the cheaper fee, and starts with video when offered", () => {
    expect(onlineFee(gp)).toBe(300);
    expect(defaultType(gp)).toBe("video");
    expect(defaultType(kids)).toBe("audio");
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
  const states = (o: Parameters<typeof consultProgress>[0]) =>
    consultProgress(o, "video", now)?.map((s) => `${s.key}:${s.state}`).join(" ");

  it("follows a consultation from booking to prescription", () => {
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

  it("has no tracker for a cancelled or missed booking", () => {
    expect(consultProgress({ status: "cancelled" }, "video", now)).toBeNull();
    expect(consultProgress({ status: "confirmed", scheduled_date: "2026-11-10" }, "video", now)).toBeNull();
  });
});
