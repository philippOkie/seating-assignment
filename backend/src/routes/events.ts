import { Router } from "express";
import { z } from "zod";
import { cancelHold, createSeatHold, getHold, listSeats } from "../services/holdService.js";

const createHoldSchema = z.object({
  seatIds: z.array(z.string().min(1)),
  idempotencyKey: z.string().min(1).max(200).optional()
});

export const eventRoutes = Router();

eventRoutes.get("/health", (_request, response) => {
  response.json({ ok: true });
});

eventRoutes.get("/events/:eventId/seats", async (request, response, next) => {
  try {
    const seats = await listSeats(request.params.eventId);
    response.json({ eventId: request.params.eventId, seats });
  } catch (error) {
    next(error);
  }
});

eventRoutes.post("/events/:eventId/holds", async (request, response, next) => {
  try {
    const body = createHoldSchema.parse(request.body);
    const customerId = request.header("x-customer-id") || "anonymous";

    const hold = await createSeatHold({
      eventId: request.params.eventId,
      customerId,
      seatIds: body.seatIds,
      idempotencyKey: body.idempotencyKey
    });

    response.status(201).json({ hold });
  } catch (error) {
    next(error);
  }
});

eventRoutes.get("/holds/:holdId", async (request, response, next) => {
  try {
    const hold = await getHold(request.params.holdId);
    response.json({ hold });
  } catch (error) {
    next(error);
  }
});

eventRoutes.delete("/holds/:holdId", async (request, response, next) => {
  try {
    const hold = await cancelHold(request.params.holdId);
    response.json({ hold });
  } catch (error) {
    next(error);
  }
});
