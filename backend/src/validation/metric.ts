// backend/src/validation/metric.ts
import Joi, { ObjectSchema } from "joi";

/**
 * Validation schema for POST /v1/metrics (ingest)
 */
export const ingestMetricSchema: ObjectSchema = Joi.object({
  api_id: Joi.string().alphanum().min(1).max(128).required().messages({
    "string.empty": "api_id is required",
    "string.alphanum": "api_id must be alphanumeric",
  }),
  // Accept either an ISO date string or a JS date - server will coerce
  timestamp: Joi.alternatives().try(Joi.date().iso(), Joi.date()).optional(),

  latency_ms: Joi.number().integer().min(0).required().messages({
    "number.base": "latency_ms must be a number",
    "number.min": "latency_ms must be >= 0",
    "any.required": "latency_ms is required",
  }),

  status_code: Joi.number().integer().min(100).max(599).required().messages({
    "number.base": "status_code must be a number",
    "number.min": "status_code must be >= 100",
    "number.max": "status_code must be <= 599",
    "any.required": "status_code is required",
  }),

  // optional fields
  error: Joi.string().allow(null).optional(),
  error_type: Joi.string()
    .valid("none", "timeout", "network", "http_error")
    .optional(),
  tags: Joi.object().optional().unknown(true), // allow arbitrary tag keys
}).options({ stripUnknown: true });
