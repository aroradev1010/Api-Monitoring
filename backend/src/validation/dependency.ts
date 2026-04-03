// src/validation/dependency.ts
import Joi, { ObjectSchema } from "joi";

export const createDependencySchema: ObjectSchema = Joi.object({
  from_service: Joi.string().min(1).max(128).required().messages({
    "any.required": "from_service is required",
    "string.empty": "from_service is required",
  }),
  to_service: Joi.string().min(1).max(128).required().messages({
    "any.required": "to_service is required",
    "string.empty": "to_service is required",
  }),
  relationship: Joi.string()
    .valid("http_call", "enqueues", "reads_from")
    .required()
    .messages({
      "any.only": "relationship must be one of: http_call, enqueues, reads_from",
      "any.required": "relationship is required",
    }),
  description: Joi.string().allow(null, "").optional(),
}).options({ stripUnknown: true });
