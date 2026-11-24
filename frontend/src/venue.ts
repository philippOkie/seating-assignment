export interface Seat {
  id: string;
  col: number;
  x: number;
  y: number;
  priceTier: number;
  status: "available" | "reserved" | "sold" | "held";
}
export interface Venue {
  venueId: string;
  name: string;
  map: { width: number; height: number };
  priceTiers: Record<
    number,
    { label: string; priceCents: number; currency: string }
  >;
  sections: {
    id: string;
    label: string;
    rows: { index: number; label: string; seats: Seat[] }[];
  }[];
}
export function buildIndex(venue: Venue) {
  const locations = new Map<
    string,
    { seat: Seat; section: number; row: number }
  >();
  venue.sections.forEach((section, s) =>
    section.rows.forEach((row, r) =>
      row.seats.forEach((seat) =>
        locations.set(seat.id, { seat, section: s, row: r }),
      ),
    ),
  );
  return locations;
}
export function restore(
  key: string,
  locations: ReturnType<typeof buildIndex>,
): string[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
    if (!Array.isArray(saved)) return [];
    return [
      ...new Set(
        saved.filter(
          (id): id is string =>
            typeof id === "string" &&
            locations.get(id)?.seat.status === "available",
        ),
      ),
    ].slice(0, 8);
  } catch {
    return [];
  }
}
export const money = (cents: number, currency: string) =>
  new Intl.NumberFormat("en-IE", { style: "currency", currency }).format(
    cents / 100,
  );
