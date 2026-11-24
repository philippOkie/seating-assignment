import { beforeEach, describe, expect, it } from "vitest";
import { createSeatHold, listSeats } from "../src/services/holdService.js";
import { store } from "../src/store/inMemoryStore.js";

const eventId = "arena-01";
const [a, b, c] = ["A-1-01", "A-1-02", "A-1-04"];
function hold(
  seatIds: string[],
  customerId = "first",
  idempotencyKey?: string,
  now?: Date,
) {
  return createSeatHold({ eventId, customerId, seatIds, idempotencyKey, now });
}

describe("inventory and retries", () => {
  beforeEach(() => store.reset());

  it("commits exactly one overlapping basket and leaves the losing basket's other seat free", async () => {
    const results = await Promise.allSettled([
      hold([a, b]),
      hold([b, c], "second"),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((r) => r.status === "rejected");
    expect(rejected?.reason).toMatchObject({ code: "SEATS_HELD" });
    const rows = await listSeats(eventId);
    expect(rows.filter((row) => row.availability === "held")).toHaveLength(2);
    const remaining = results[0].status === "fulfilled" ? c : a;
    await expect(hold([remaining])).resolves.toBeDefined();
  });

  it("replays concurrent retries with reordered seats and rejects a changed request", async () => {
    const results = await Promise.all([
      hold([a, b], "first", "key"),
      hold([b, a], "first", "key"),
    ]);
    expect(results[0].id).toBe(results[1].id);
    await expect(hold([c], "first", "key")).rejects.toMatchObject({
      code: "KEY_REUSED",
    });
    await expect(hold([c], "second", "key")).resolves.toMatchObject({
      customerId: "second",
    });
  });

  it("releases seats at the expiry boundary before background cleanup", async () => {
    const old = await hold([a], "first", undefined, new Date(0));
    expect(
      (await listSeats(eventId)).find((seat) => seat.id === a)?.availability,
    ).toBe("available");
    await expect(
      hold([a], "second", undefined, new Date(Date.parse(old.expiresAt) - 1)),
    ).rejects.toMatchObject({ code: "SEATS_HELD" });
    await expect(
      hold([a], "second", undefined, new Date(old.expiresAt)),
    ).resolves.toBeDefined();
  });

  it("rejects duplicates and unknown seats without a partial write", async () => {
    await expect(hold([a, a])).rejects.toMatchObject({
      code: "DUPLICATE_SEATS",
    });
    await expect(hold([a, "unknown"])).rejects.toMatchObject({
      code: "SEATS_NOT_FOUND",
    });
    await expect(hold([a])).resolves.toBeDefined();
  });
});
