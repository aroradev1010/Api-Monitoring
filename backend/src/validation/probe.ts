// backend/src/validation/probe.ts
import Joi, { ObjectSchema } from "joi";

/**
 * POST /v1/probe/:api_id body validation
 * Accepts optional timeout in ms and optional target override
 */
export const runProbeSchema: ObjectSchema = Joi.object({
  timeout: Joi.number().integer().min(100).max(60000).optional().messages({
    "number.base": "timeout must be a number (ms)",
    "number.min": "timeout must be at least 100 ms",
    "number.max": "timeout must be <= 60000 ms",
  }),
  // optional override target (rarely used - server normally uses api.base_url)
  target: Joi.string().uri().optional().messages({
    "string.uri": "target must be a valid URL",
  }),
}).options({ stripUnknown: true });
