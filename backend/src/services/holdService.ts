import type { SeatHold, SeatWithAvailability } from "../domain/types.js";
import { store } from "../store/inMemoryStore.js";

import { ApiError } from "../domain/apiError.js";
export { ApiError };

export async function listSeats(
  eventId: string,
): Promise<SeatWithAvailability[]> {
  const event = await store.getEvent(eventId);

  if (!event) {
    throw new ApiError(
      404,
      "EVENT_NOT_FOUND",
      `Event ${eventId} was not found`,
    );
  }

  const holds = await store.listHoldsForEvent(eventId);

  const now = Date.now();
  return event.seats.map((seat) => {
    const activeHold = holds.find(
      (hold) =>
        hold.status === "active" &&
        Date.parse(hold.expiresAt) > now &&
        hold.seatIds.includes(seat.id),
    );

    return {
      ...seat,
      availability: activeHold ? "held" : seat.status,
      activeHoldId: activeHold?.id,
    };
  });
}

export async function createSeatHold(input: {
  eventId: string;
  customerId: string;
  seatIds: string[];
  idempotencyKey?: string;
  now?: Date;
}): Promise<SeatHold> {
  if (input.seatIds.length === 0) {
    throw new ApiError(
      400,
      "NO_SEATS_REQUESTED",
      "At least one seat is required",
    );
  }

  if (input.seatIds.length > 8) {
    throw new ApiError(
      400,
      "TOO_MANY_SEATS",
      "A hold can contain at most 8 seats",
    );
  }

  if (new Set(input.seatIds).size !== input.seatIds.length) {
    throw new ApiError(400, "DUPLICATE_SEATS", "Seat IDs must be unique");
  }
  return store.createHold(input);
}

export async function getHold(holdId: string): Promise<SeatHold> {
  const hold = await store.getHold(holdId);

  if (!hold) {
    throw new ApiError(404, "HOLD_NOT_FOUND", `Hold ${holdId} was not found`);
  }

  return hold;
}

export async function cancelHold(holdId: string): Promise<SeatHold> {
  const hold = await store.cancelHold(holdId);

  if (!hold) {
    throw new ApiError(404, "HOLD_NOT_FOUND", `Hold ${holdId} was not found`);
  }

  return hold;
}
