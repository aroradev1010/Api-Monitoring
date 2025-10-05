// src/config/index.ts
import dotenv from "dotenv";
import Joi from "joi";
import logger from "../logger";

dotenv.config(); // load .env into process.env

// Joi schema for environment variables.
// We include defaults and use `convert: true` when validating so types are coerced (e.g. "3000" -> 3000).
const envSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid("development", "production", "test")
    .default("development"),
  PORT: Joi.number().integer().min(1).max(65535).default(3000),
  MONGO_URI: Joi.string().uri().required(),
  PROBE_DEFAULT_INTERVAL: Joi.number().integer().min(1).default(30),
  SLACK_WEBHOOK: Joi.string().uri().allow("", null).optional(),
}).unknown(true); // allow other environment vars

// Validate process.env against schema
const { value: envVars, error } = envSchema.validate(process.env, {
  abortEarly: false,
  convert: true,
});

if (error) {
  // Print validation errors and exit — fail-fast on missing/invalid config.
  logger.error({ error }, "❌ Invalid environment configuration:");
  error.details.forEach((d) => {
    logger.error(`  - ${d.message}`);
  });
  // Using synchronous exit so process manager (or CI) sees failure
  process.exit(1);
}

// Typed Config interface (keeps TS knowledge and runtime values consistent)
export interface Config {
  NODE_ENV: "development" | "production" | "test";
  PORT: number;
  MONGO_URI: string;
  PROBE_DEFAULT_INTERVAL: number;
  SLACK_WEBHOOK?: string | null;
}

// Build typed config object from validated env vars
const config: Config = {
  NODE_ENV: envVars.NODE_ENV,
  PORT: envVars.PORT,
  MONGO_URI: envVars.MONGO_URI,
  PROBE_DEFAULT_INTERVAL: envVars.PROBE_DEFAULT_INTERVAL,
  SLACK_WEBHOOK: envVars.SLACK_WEBHOOK ?? null,
};

export default config;
