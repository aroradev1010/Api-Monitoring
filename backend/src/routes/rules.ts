// backend/src/routes/rules.ts
import express from "express";
import {
  createRule,
  deleteRule,
  listRules,
} from "../controllers/rules.controller";
import { validate } from "../middlewares/validate";
import { createRuleSchema } from "../validation/rule";

const router = express.Router();

router.post("/", validate(createRuleSchema), createRule);
router.get("/", listRules);
router.delete("/:rule_id", deleteRule);

export default router;
