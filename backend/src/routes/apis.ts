// backend/src/routes/apis.ts
import express from "express";
import {
  createApi,
  listApis,
  getApi,
  deleteApi,
  updateApi,
} from "../controllers/api.controller";
import { validate } from "../middlewares/validate";
import { createApiSchema } from "../validation/api";

const router = express.Router();

router.post("/", validate(createApiSchema), createApi); // POST /v1/apis
router.get("/", listApis); // GET /v1/apis
router.get("/:api_id", getApi); // GET /v1/apis/:api_id
router.delete("/:api_id", deleteApi); // DELETE /v1/apis/:api_id
router.put("/:api_id", validate(createApiSchema), updateApi); // PUT /v1/apis/:api_id (optional)

export default router;
