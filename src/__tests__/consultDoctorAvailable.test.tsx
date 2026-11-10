import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { render } from "@/test-utils";
import { ServiceIntro } from "@/components/services/ServiceIntro";

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "user-1" } }) }));

const renderIntro = (serviceType: "doctor" | "physio") =>
  render(
    <MemoryRouter>
      <ServiceIntro serviceType={serviceType} onProceed={() => {}} />
    </MemoryRouter>,
  );

describe("Consult a doctor", () => {
  it("lets the patient go on to book a doctor", () => {
    renderIntro("doctor");
    expect(screen.queryByText("Service Not Available")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Proceed to Booking" })).toBeEnabled();
  });

  it("still keeps physiotherapy closed", () => {
    renderIntro("physio");
    expect(screen.getByText("Service Not Available")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Currently Unavailable" })).toBeDisabled();
  });
});
