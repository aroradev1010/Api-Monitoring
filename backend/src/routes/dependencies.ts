// src/routes/dependencies.ts
import express from "express";
import { validate } from "../middlewares/validate";
import {
  createDependency,
  deleteDependency,
  getDependencies,
  listServices,
} from "../controllers/dependency.controller";
import { createDependencySchema } from "../validation/dependency";

const router = express.Router();

// POST /v1/dependencies
router.post("/", validate(createDependencySchema), createDependency);
// DELETE /v1/dependencies/:id
router.delete("/:id", deleteDependency);
// GET /v1/dependencies?service=
router.get("/", getDependencies);

export default router;

// Services sub-router (mounted separately at /v1/services)
export const servicesRouter = express.Router();
servicesRouter.get("/", listServices);
