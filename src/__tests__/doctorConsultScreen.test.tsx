import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen, within } from "@/test-utils";
import { MemoryRouter, Route, Routes, useLocation, useParams } from "react-router-dom";
import DoctorConsultScreen from "@/pages/DoctorConsultScreen";
import type { Doctor } from "@/types/consultation";
import type { BookDoctorState } from "@/pages/BookDoctorScreen";

const doc = (over: Partial<Doctor>): Doctor => ({
  id: "d",
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

const DOCTORS: Doctor[] = [
  doc({ id: "gp", name: "Ananya Sen", specialty: "General Physician", qualification: "MBBS", experience: 12, rating: 4.8, reviews: 20, videoCallFee: 399, audioCallFee: 299, languages: ["English", "Bengali"] }),
  doc({ id: "skin", name: "Sourav Ghosh", specialty: "Dermatologist", experience: 9, videoCallFee: 499, fullToday: true }),
  doc({ id: "kids", name: "Arijit Das", specialty: "Paediatrician", experience: 21, audioCallFee: 199 }),
];

const query = { data: DOCTORS, isLoading: false, isError: false, refetch: vi.fn(), isFetching: false };
vi.mock("@/hooks/useDoctors", () => ({ useDoctors: () => query }));

function BookPage() {
  const state = useLocation().state as BookDoctorState;
  return <p>Booking {state.doctor.name} by {state.type}</p>;
}
function ProfilePage() {
  return <p>Profile {useParams().id}</p>;
}

const renderScreen = (path = "/doctor-consult") =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/doctor-consult" element={<DoctorConsultScreen />} />
        <Route path="/book-doctor" element={<BookPage />} />
        <Route path="/doctor/:id" element={<ProfilePage />} />
      </Routes>
    </MemoryRouter>,
  );

const cards = () => screen.getAllByRole("article");
const names = () => cards().map((c) => within(c).getByRole("heading").textContent);

describe("Consult a doctor page", () => {
  it("lists each doctor with what each kind of consultation costs, and who can be booked today", () => {
    renderScreen();
    expect(screen.getByText("3 doctors")).toBeInTheDocument();
    const gp = cards().find((c) => within(c).queryByText("Dr Ananya Sen"))!;
    expect(within(gp).getByText("Available today")).toBeInTheDocument();
    expect(within(gp).getByText("₹399")).toBeInTheDocument();
    expect(within(gp).getByText("₹299")).toBeInTheDocument();
    expect(within(gp).getByText("English, Bengali")).toBeInTheDocument();
    expect(within(gp).getByRole("button", { name: "Book" })).toBeEnabled();

    const full = cards().find((c) => within(c).queryByText("Dr Sourav Ghosh"))!;
    expect(within(full).getByText("Fully booked for today")).toBeInTheDocument();
    expect(within(full).getByRole("button", { name: "Book" })).toBeDisabled();
  });

  it("filters by the specialty tapped, and offers a General Physician when a specialty has nobody", () => {
    renderScreen();
    fireEvent.click(screen.getByRole("button", { name: /Paedia/ }));
    expect(names()).toEqual(["Dr Arijit Das"]);

    fireEvent.click(screen.getByRole("button", { name: /^Dentist/ }));
    expect(screen.getByText("No Dentist on BloodLyn yet")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "See General Physicians" }));
    expect(names()).toEqual(["Dr Ananya Sen"]);
  });

  it("sorts by the chip chosen", () => {
    renderScreen();
    fireEvent.click(screen.getByRole("radio", { name: "Lowest fee" }));
    expect(screen.getByRole("radio", { name: "Lowest fee" })).toHaveAttribute("aria-checked", "true");
    expect(names()).toEqual(["Dr Arijit Das", "Dr Ananya Sen", "Dr Sourav Ghosh"]);
  });

  it("finds a doctor by the patient's problem", () => {
    renderScreen("/doctor-consult?q=hair%20fall");
    expect(names()).toEqual(["Dr Sourav Ghosh"]);
  });

  it("says so when a search finds nobody", () => {
    renderScreen("/doctor-consult?q=knee%20replacement");
    expect(screen.getByText('No doctor found for "knee replacement"')).toBeInTheDocument();
  });

  it("books with the doctor's first offered mode, and opens the doctor's page from the card", () => {
    renderScreen();
    const kids = cards().find((c) => within(c).queryByText("Dr Arijit Das"))!;
    fireEvent.click(within(kids).getByRole("button", { name: "Book" }));
    expect(screen.getByText("Booking Arijit Das by audio")).toBeInTheDocument();
  });

  it("opens the doctor's page when the doctor is tapped", () => {
    renderScreen();
    fireEvent.click(screen.getByRole("button", { name: "About Dr Ananya Sen" }));
    expect(screen.getByText("Profile gp")).toBeInTheDocument();
  });

  it("always says it is not for emergencies", () => {
    renderScreen();
    expect(screen.getByText(/Not for emergencies/)).toBeInTheDocument();
    expect(screen.getByText(/call 112/)).toBeInTheDocument();
  });
});
