/**
 * A home collection needs an address a collector can find. "Belda, West Bengal,
 * 721424" isn't one: it needs the house or flat and street, and a landmark.
 * address_line2 holds the landmark.
 */
export function collectionAddressProblem(address: { address_line1?: string | null; address_line2?: string | null }): string | null {
  const house = (address.address_line1 ?? "").trim();
  const landmark = (address.address_line2 ?? "").trim();
  if (house.length < 5) return "Add your house or flat number and street, so the collector can find you";
  if (landmark.length < 3) return "Add a landmark near your home, for example near a temple or school";
  return null;
}
