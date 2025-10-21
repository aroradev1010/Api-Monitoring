import express from "express";
import {
  createRule,
  listRules,
  deleteRule,
} from "../controllers/rules.controller";

const router = express.Router();

router.post("/", createRule);
router.get("/", listRules);
router.delete("/:id", deleteRule);

export default router;
