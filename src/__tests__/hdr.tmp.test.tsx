import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ZomatoStyleHeader } from "@/components/layout/ZomatoStyleHeader";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CartProvider } from "@/contexts/CartContext";

describe("hdr", () => {
  it("opens modal", async () => {
    const qc = new QueryClient();
    render(<QueryClientProvider client={qc}><MemoryRouter><CartProvider><ZomatoStyleHeader /></CartProvider></MemoryRouter></QueryClientProvider>);
    fireEvent.click(screen.getByText(/Home/i));
    await new Promise(r => setTimeout(r, 300));
    expect(screen.queryByText(/Select Delivery Location/i)).toBeTruthy();
  });
});
