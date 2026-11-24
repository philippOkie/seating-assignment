export type SeatStatus = "available" | "reserved" | "sold";

export type Seat = {
  id: string;
  section: string;
  row: number;
  number: number;
  priceTier: 1 | 2 | 3;
  status: SeatStatus;
};

export type Event = {
  id: string;
  name: string;
  seats: Seat[];
};

export type HoldStatus = "active" | "cancelled";

export type SeatHold = {
  id: string;
  eventId: string;
  customerId: string;
  seatIds: string[];
  status: HoldStatus;
  idempotencyKey?: string;
  createdAt: string;
  expiresAt: string;
};

export type SeatWithAvailability = Seat & {
  availability: SeatStatus | "held";
  activeHoldId?: string;
};
