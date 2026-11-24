import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp, resetForTests } from "../src/app.js";

const app = createApp();

describe("seat hold API", () => {
  beforeEach(() => {
    resetForTests();
  });

  it("creates a hold for available seats", async () => {
    const response = await request(app)
      .post("/events/arena-01/holds")
      .set("x-customer-id", "customer-a")
      .send({ seatIds: ["A-1-01", "A-1-02"] })
      .expect(201);

    expect(response.body.hold).toMatchObject({
      eventId: "arena-01",
      customerId: "customer-a",
      seatIds: ["A-1-01", "A-1-02"],
      status: "active"
    });
  });

  it("rejects holds with more than 8 seats", async () => {
    const response = await request(app)
      .post("/events/arena-01/holds")
      .send({ seatIds: ["A-1-01", "A-1-02", "A-1-03", "A-1-04", "A-1-05", "A-1-06", "A-1-07", "A-1-08", "A-1-09"] })
      .expect(400);

    expect(response.body.error.code).toBe("TOO_MANY_SEATS");
  });

  it("rejects a sequential hold when a seat is already held", async () => {
    await request(app)
      .post("/events/arena-01/holds")
      .set("x-customer-id", "customer-a")
      .send({ seatIds: ["A-1-08"] })
      .expect(201);

    const response = await request(app)
      .post("/events/arena-01/holds")
      .set("x-customer-id", "customer-b")
      .send({ seatIds: ["A-1-08"] })
      .expect(409);

    expect(response.body.error.code).toBe("SEATS_HELD");
  });

  it("returns the same hold when the same idempotency key is retried", async () => {
    const first = await request(app)
      .post("/events/arena-01/holds")
      .set("x-customer-id", "customer-a")
      .send({ seatIds: ["A-1-04"], idempotencyKey: "retry-key-1" })
      .expect(201);

    const second = await request(app)
      .post("/events/arena-01/holds")
      .set("x-customer-id", "customer-a")
      .send({ seatIds: ["A-1-04"], idempotencyKey: "retry-key-1" })
      .expect(201);

    expect(second.body.hold.id).toBe(first.body.hold.id);
  });

  it("marks held seats in the seat listing", async () => {
    const holdResponse = await request(app)
      .post("/events/arena-01/holds")
      .set("x-customer-id", "customer-a")
      .send({ seatIds: ["A-1-05"] })
      .expect(201);

    const seatsResponse = await request(app)
      .get("/events/arena-01/seats")
      .expect(200);

    const heldSeat = seatsResponse.body.seats.find((seat: { id: string }) => seat.id === "A-1-05");
    expect(heldSeat).toMatchObject({
      id: "A-1-05",
      availability: "held",
      activeHoldId: holdResponse.body.hold.id
    });
  });

  it("allows a seat to be held again after cancelling a hold", async () => {
    const holdResponse = await request(app)
      .post("/events/arena-01/holds")
      .set("x-customer-id", "customer-a")
      .send({ seatIds: ["A-1-06"] })
      .expect(201);

    await request(app)
      .delete(`/holds/${holdResponse.body.hold.id}`)
      .expect(200);

    await request(app)
      .post("/events/arena-01/holds")
      .set("x-customer-id", "customer-b")
      .send({ seatIds: ["A-1-06"] })
      .expect(201);
  });

  it("does not allow two simultaneous requests to hold the same seat", async () => {
    const [first, second] = await Promise.all([
      request(app)
        .post("/events/arena-01/holds")
        .set("x-customer-id", "customer-a")
        .send({ seatIds: ["A-1-07"] }),
      request(app)
        .post("/events/arena-01/holds")
        .set("x-customer-id", "customer-b")
        .send({ seatIds: ["A-1-07"] })
    ]);

    const statuses = [first.status, second.status].sort();
    expect(statuses).toEqual([201, 409]);
  });
});
