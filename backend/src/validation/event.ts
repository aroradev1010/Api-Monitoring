// backend/src/validation/event.ts
import Joi, { ObjectSchema } from "joi";

const idPattern = /^[A-Za-z0-9_-]+$/;

/**
 * Validation schema for POST /v1/events (ingest)
 */
export const ingestEventSchema: ObjectSchema = Joi.object({
  service: Joi.string().pattern(idPattern).min(1).max(128).required().messages({
    "string.empty": "service is required",
  }),

  kind: Joi.string()
    .valid("http_request", "job_execution", "cron_execution", "custom")
    .required()
    .messages({
      "any.only": "kind must be one of: http_request, job_execution, cron_execution, custom",
      "any.required": "kind is required",
    }),

  operation: Joi.string().min(1).max(512).required().messages({
    "string.empty": "operation is required",
    "any.required": "operation is required",
  }),

  correlation_id: Joi.string().allow(null).optional(),
  parent_event_id: Joi.string().allow(null).optional(),

  status: Joi.string()
    .valid("ok", "error", "timeout")
    .required()
    .messages({
      "any.only": "status must be one of: ok, error, timeout",
      "any.required": "status is required",
    }),

  latency_ms: Joi.number().integer().min(0).required().messages({
    "number.base": "latency_ms must be a number",
    "number.min": "latency_ms must be >= 0",
    "any.required": "latency_ms is required",
  }),

  error_code: Joi.string().allow(null).optional(),
  error_message: Joi.string().allow(null).optional(),

  started_at: Joi.alternatives()
    .try(Joi.date().iso(), Joi.date())
    .required()
    .messages({ "any.required": "started_at is required" }),

  ended_at: Joi.alternatives()
    .try(Joi.date().iso(), Joi.date())
    .required()
    .messages({ "any.required": "ended_at is required" }),

  http: Joi.object({
    method: Joi.string().required(),
    path: Joi.string().required(),
    status_code: Joi.number().integer().min(100).max(599).required(),
    target_url: Joi.string().required(),
  }).optional(),

  job: Joi.object({
    queue: Joi.string().allow(null).optional(),
    attempt: Joi.number().integer().min(0).required(),
    max_attempts: Joi.number().integer().min(1).required(),
  }).optional(),

  tags: Joi.object().optional().unknown(true),

  sdk_version: Joi.string().allow(null).optional(),
  api_key: Joi.string().optional().default("default"),
}).options({ stripUnknown: true });
