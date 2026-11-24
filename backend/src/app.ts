import cors from "cors";
import express from "express";
import { ZodError } from "zod";
import { eventRoutes } from "./routes/events.js";
import { ApiError } from "./services/holdService.js";
import { store } from "./store/inMemoryStore.js";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(eventRoutes);

  app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
    if (error instanceof ZodError) {
      response.status(400).json({
        error: {
          code: "INVALID_REQUEST",
          message: "Request body is invalid",
          details: error.flatten()
        }
      });
      return;
    }

    if (error instanceof ApiError) {
      response.status(error.statusCode).json({
        error: {
          code: error.code,
          message: error.message,
          details: error.details
        }
      });
      return;
    }

    console.error(error);
    response.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Something went wrong"
      }
    });
  });

  return app;
}

export function resetForTests() {
  store.reset();
}
