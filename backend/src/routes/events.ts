// backend/src/routes/events.ts
import express from "express";
import { validate } from "../middlewares/validate";
import { ingestEvent, getEvents, ingestBatch } from "../controllers/event.controller";
import { ingestEventSchema, ingestBatchSchema } from "../validation/event";

const router = express.Router();

// POST /v1/events - ingest a single event
router.post("/", validate(ingestEventSchema), ingestEvent);

// POST /v1/events/batch - ingest a batch of events (SDK)
router.post("/batch", validate(ingestBatchSchema), ingestBatch);

// GET /v1/events?service=...&limit=...
router.get("/", getEvents);

export default router;

