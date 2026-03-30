import dotenv from "dotenv";
import Joi from "joi";
import logger from "../logger";

dotenv.config();

const envSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid("development", "production", "test")
    .default("development"),
  PORT: Joi.number().integer().min(1).max(65535).default(3000),
  MONGO_URI: Joi.when("NODE_ENV", {
    is: Joi.valid("test"),
    then: Joi.string().uri().optional().allow("", null),
    otherwise: Joi.string().uri().required(),
  }),
  PROBE_DEFAULT_INTERVAL: Joi.number().integer().min(1).default(30),
  SLACK_WEBHOOK: Joi.string().uri().allow("", null).optional(),
}).unknown(true); 

const { value: envVars, error } = envSchema.validate(process.env, {
  abortEarly: false,
  convert: true,
});

if (error) {
  logger.error({ error }, "❌ Invalid environment configuration:");
  error.details.forEach((d) => {
    logger.error(`  - ${d.message}`);
  });
  
  process.exit(1);
}

export interface Config {
  NODE_ENV: "development" | "production" | "test";
  PORT: number;
  MONGO_URI: string;
  PROBE_DEFAULT_INTERVAL: number;
  SLACK_WEBHOOK?: string | null;
}

const config: Config = {
  NODE_ENV: envVars.NODE_ENV,
  PORT: envVars.PORT,
  MONGO_URI: envVars.MONGO_URI,
  PROBE_DEFAULT_INTERVAL: envVars.PROBE_DEFAULT_INTERVAL,
  SLACK_WEBHOOK: envVars.SLACK_WEBHOOK ?? null,
};

export default config;
