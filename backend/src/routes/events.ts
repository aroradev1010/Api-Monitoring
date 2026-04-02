// backend/src/routes/events.ts
import express from "express";
import { validate } from "../middlewares/validate";
import { ingestEvent, getEvents } from "../controllers/event.controller";
import { ingestEventSchema } from "../validation/event";

const router = express.Router();

// POST /v1/events - ingest an event
router.post("/", validate(ingestEventSchema), ingestEvent);

// GET /v1/events?service=...&limit=...
router.get("/", getEvents);

export default router;
