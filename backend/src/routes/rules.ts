// backend/src/routes/rules.ts
import express from "express";
import { createRule, deleteRule, listRules } from "../controllers/rules.controller";

const router = express.Router();

router.post("/", createRule);
router.get("/", listRules);
router.delete("/:rule_id", deleteRule);

export default router;
