// backend/src/validation/rule.ts
import Joi, { ObjectSchema } from "joi";

/**
 * POST /v1/rules payload validation
 */

const idPattern = /^[A-Za-z0-9_-]+$/;

export const createRuleSchema: ObjectSchema = Joi.object({
  rule_id: Joi.string().pattern(idPattern).min(3).max(64).required().messages({
    "string.empty": "rule_id is required",
  }),
  name: Joi.string().min(1).max(200).required().messages({
    "string.empty": "name is required",
  }),
  api_id: Joi.string().pattern(idPattern).min(3).max(64).allow(null).optional(),
  type: Joi.string().valid("latency_gt", "status_not").required().messages({
    "any.only": "type must be one of [latency_gt, status_not]",
  }),
  // threshold meaning depends on type (latency_ms for latency_gt,
  // for status_not it could be array but keeping common numeric threshold here)
  threshold: Joi.alternatives()
    .try(
      Joi.number().integer().min(0),
      Joi.array().items(Joi.number().integer())
    )
    .required()
    .messages({
      "any.required": "threshold is required",
    }),
}).options({ stripUnknown: true });
