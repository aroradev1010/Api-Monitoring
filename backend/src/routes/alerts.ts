// backend/src/routes/alerts.ts
import express from "express";
import { listAlerts } from "../controllers/alert.controller";
const router = express.Router();

router.get("/", listAlerts); // GET /v1/alerts

export default router;
