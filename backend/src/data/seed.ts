import type { Event, Seat } from "../domain/types.js";

function buildSection(section: string, rows: number, seatsPerRow: number, reservedEvery = 0): Seat[] {
  const seats: Seat[] = [];

  for (let row = 1; row <= rows; row += 1) {
    for (let number = 1; number <= seatsPerRow; number += 1) {
      const id = `${section}-${row}-${String(number).padStart(2, "0")}`;
      const isReserved = reservedEvery > 0 && (row * seatsPerRow + number) % reservedEvery === 0;
      const isSold = (row + number) % 23 === 0;

      seats.push({
        id,
        section,
        row,
        number,
        priceTier: section === "A" ? 1 : section === "B" ? 2 : 3,
        status: isSold ? "sold" : isReserved ? "reserved" : "available"
      });
    }
  }

  return seats;
}

export const initialEvents: Event[] = [
  {
    id: "arena-01",
    name: "Metropolis Arena",
    seats: [
      ...buildSection("A", 8, 16, 19),
      ...buildSection("B", 6, 14, 17),
      ...buildSection("C", 4, 10, 13)
    ]
  }
];
