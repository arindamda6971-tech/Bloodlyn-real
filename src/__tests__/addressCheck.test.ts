import { describe, it, expect } from "vitest";
import { collectionAddressProblem } from "@/lib/addressCheck";

describe("collectionAddressProblem", () => {
  it("accepts a house and street with a landmark", () => {
    expect(collectionAddressProblem({ address_line1: "12 Station Road", address_line2: "Near Shiv Mandir" })).toBeNull();
  });

  it("asks for the house and street when missing or too short", () => {
    expect(collectionAddressProblem({ address_line1: "", address_line2: "Near school" })).toMatch(/house or flat/);
    expect(collectionAddressProblem({ address_line1: "12", address_line2: "Near school" })).toMatch(/house or flat/);
  });

  it("asks for a landmark when missing", () => {
    expect(collectionAddressProblem({ address_line1: "12 Station Road", address_line2: null })).toMatch(/landmark/);
    expect(collectionAddressProblem({ address_line1: "12 Station Road", address_line2: "  " })).toMatch(/landmark/);
  });
});
