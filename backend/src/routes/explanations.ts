// src/routes/explanations.ts
import express from "express";
import {
  getExplanations,
  getLatestExplanation,
  getExplanationById,
} from "../controllers/explanation.controller";

const router = express.Router();

// GET /v1/explanations?service=&limit=
router.get("/", getExplanations);
// GET /v1/explanations/latest?service= (MUST be before :id)
router.get("/latest", getLatestExplanation);
// GET /v1/explanations/:id
router.get("/:id", getExplanationById);

export default router;
