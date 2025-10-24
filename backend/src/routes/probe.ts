// backend/src/routes/probe.ts
import express from "express";
import { runProbe } from "../controllers/probe.controller";
import { validate } from "../middlewares/validate";
import { runProbeSchema } from "../validation/probe";

const router = express.Router();

// POST /v1/probe/:api_id -> run one probe for the api (server-side)
router.post("/:api_id", validate(runProbeSchema), runProbe);

export default router;
