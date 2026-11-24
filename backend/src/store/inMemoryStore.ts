import { ApiError } from "../domain/apiError.js";
import { randomUUID } from "node:crypto";
import type { Event, SeatHold } from "../domain/types.js";
import { initialEvents } from "../data/seed.js";
import { addMilliseconds, HOLD_TTL_MS, sleep } from "../utils/time.js";

function cloneEvent(event: Event): Event {
  return {
    ...event,
    seats: event.seats.map((seat) => ({ ...seat })),
  };
}

function cloneHold(hold: SeatHold): SeatHold {
  return {
    ...hold,
    seatIds: [...hold.seatIds],
  };
}

export class InMemoryStore {
  private events = new Map<string, Event>();
  private holds = new Map<string, SeatHold>();

  constructor(events: Event[] = initialEvents) {
    for (const event of events) {
      this.events.set(event.id, cloneEvent(event));
    }
  }

  reset(): void {
    this.events.clear();
    this.holds.clear();

    for (const event of initialEvents) {
      this.events.set(event.id, cloneEvent(event));
    }
  }

  async getEvent(eventId: string): Promise<Event | undefined> {
    await sleep(5);
    const event = this.events.get(eventId);
    return event ? cloneEvent(event) : undefined;
  }

  async getHold(holdId: string): Promise<SeatHold | undefined> {
    await sleep(5);
    const hold = this.holds.get(holdId);
    return hold ? cloneHold(hold) : undefined;
  }

  async listHoldsForEvent(eventId: string): Promise<SeatHold[]> {
    await sleep(5);
    return [...this.holds.values()]
      .filter((hold) => hold.eventId === eventId)
      .map(cloneHold);
  }

  async createHold(input: {
    eventId: string;
    customerId: string;
    seatIds: string[];
    idempotencyKey?: string;
    now?: Date;
  }): Promise<SeatHold> {
    await sleep(25);

    // No await between checking inventory and committing the complete hold.
    const now = input.now ?? new Date();
    const event = this.events.get(input.eventId);
    if (!event)
      throw new ApiError(404, "EVENT_NOT_FOUND", "Event was not found");

    const holds = [...this.holds.values()].filter(
      (hold) => hold.eventId === input.eventId,
    );
    if (input.idempotencyKey) {
      const prior = holds.find(
        (hold) =>
          hold.customerId === input.customerId &&
          hold.idempotencyKey === input.idempotencyKey,
      );
      if (prior) {
        if (
          prior.seatIds.length !== input.seatIds.length ||
          !input.seatIds.every((id) => prior.seatIds.includes(id))
        ) {
          throw new ApiError(
            409,
            "KEY_REUSED",
            "This key was used for different seats",
          );
        }
        return cloneHold(prior);
      }
    }

    const seats = input.seatIds.map((id) =>
      event.seats.find((seat) => seat.id === id),
    );
    const missing = input.seatIds.filter((_, index) => !seats[index]);
    if (missing.length)
      throw new ApiError(404, "SEATS_NOT_FOUND", "Unknown seats", {
        seatIds: missing,
      });
    const unavailable = seats
      .filter((seat) => seat?.status !== "available")
      .map((seat) => seat?.id);
    if (unavailable.length)
      throw new ApiError(409, "SEATS_UNAVAILABLE", "Unavailable seats", {
        seatIds: unavailable,
      });

    const blocking = holds.find(
      (hold) =>
        hold.status === "active" &&
        Date.parse(hold.expiresAt) > now.getTime() &&
        hold.seatIds.some((id) => input.seatIds.includes(id)),
    );
    if (blocking) {
      throw new ApiError(409, "SEATS_HELD", "Seats are already held", {
        holdId: blocking.id,
        seatIds: blocking.seatIds.filter((id) => input.seatIds.includes(id)),
      });
    }
    const hold: SeatHold = {
      id: randomUUID(),
      eventId: input.eventId,
      customerId: input.customerId,
      seatIds: [...input.seatIds],
      status: "active",
      idempotencyKey: input.idempotencyKey,
      createdAt: now.toISOString(),
      expiresAt: addMilliseconds(now, HOLD_TTL_MS).toISOString(),
    };

    this.holds.set(hold.id, hold);
    return cloneHold(hold);
  }

  async cancelHold(holdId: string): Promise<SeatHold | undefined> {
    await sleep(10);
    const hold = this.holds.get(holdId);

    if (!hold) {
      return undefined;
    }

    const cancelled = { ...hold, status: "cancelled" as const };
    this.holds.set(holdId, cancelled);
    return cloneHold(cancelled);
  }

  async cleanupExpiredHolds(now: Date): Promise<number> {
    let cancelledCount = 0;

    for (const hold of this.holds.values()) {
      if (
        hold.status === "active" &&
        new Date(hold.expiresAt).getTime() <= now.getTime()
      ) {
        this.holds.set(hold.id, { ...hold, status: "cancelled" });
        cancelledCount += 1;
      }
    }

    return cancelledCount;
  }
}

export const store = new InMemoryStore();
