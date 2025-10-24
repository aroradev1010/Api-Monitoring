// backend/src/validation/api.ts
import Joi, { ObjectSchema } from "joi";

/**
 * POST /v1/apis payload validation
 */

const idPattern = /^[A-Za-z0-9_-]+$/;
export const createApiSchema: ObjectSchema = Joi.object({
  api_id: Joi.string().pattern(idPattern).min(3).max(50).required().messages({
    "string.empty": "api_id is required",
  }),
  name: Joi.string().min(1).max(200).required().messages({
    "string.empty": "name is required",
  }),
  base_url: Joi.string().uri().required().messages({
    "string.uri": "base_url must be a valid URL",
    "string.empty": "base_url is required",
  }),
  probe_interval: Joi.number().integer().min(5).default(30).messages({
    "number.base": "probe_interval must be a number",
    "number.min": "probe_interval must be at least 5 seconds",
  }),
  expected_status: Joi.array()
    .items(Joi.number().integer().min(100).max(599))
    .default([200])
    .messages({
      "array.base": "expected_status must be an array of HTTP status codes",
    }),
}).options({ stripUnknown: true });
