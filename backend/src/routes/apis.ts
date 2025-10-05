// src/routes/apis.ts
import express from "express";
import Joi from "joi";
import { validate } from "../middlewares/validate";
import { listApis, createApi } from "../controllers/api.controller";

const router = express.Router();

const apiCreateSchema = Joi.object({
  api_id: Joi.string()
    .pattern(/^[a-zA-Z0-9_-]+$/)
    .min(3)
    .max(64)
    .required()
    .messages({
      "string.pattern.base":
        '"api_id" may only contain letters, numbers, underscores, or hyphens',
    }),
  name: Joi.string().min(3).max(128).required(),
  base_url: Joi.string().uri().required(),
  probe_interval: Joi.number().integer().min(5).max(3600).optional(),
  expected_status: Joi.array().items(Joi.number().integer()).optional(),
});

router.get("/", listApis);
router.post("/", validate(apiCreateSchema), createApi);

export default router;
