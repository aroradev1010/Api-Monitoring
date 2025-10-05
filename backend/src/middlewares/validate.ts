// src/middlewares/validate.ts
import { RequestHandler } from "express";
import { ObjectSchema } from "joi";

/**
 * validate(schema) returns an Express middleware that validates req.body
 * If validation fails, it returns 400 with the Joi message.
 */
export function validate(schema: ObjectSchema): RequestHandler {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      allowUnknown: false,
    });
    if (error) {
      return res
        .status(400)
        .json({ error: error.details.map((d) => d.message).join(", ") });
    }
    // replace body with validated value (useful for casting/coercion)
    req.body = value;
    next();
  };
}
