// src/config/index.ts
import dotenv from "dotenv";
dotenv.config();

export interface Config {
  NODE_ENV: "development" | "production" | "test";
  PORT: number;
  MONGO_URI: string;
  PROBE_DEFAULT_INTERVAL: number;
  SLACK_WEBHOOK?: string;
}

const raw = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: Number(process.env.PORT || 3000),
  MONGO_URI: process.env.MONGO_URI || "mongodb://localhost:27017/apimon",
  PROBE_DEFAULT_INTERVAL: Number(process.env.PROBE_DEFAULT_INTERVAL || 30),
  SLACK_WEBHOOK: process.env.SLACK_WEBHOOK,
};

const config: Config = {
  NODE_ENV: raw.NODE_ENV as Config["NODE_ENV"],
  PORT: raw.PORT,
  MONGO_URI: raw.MONGO_URI,
  PROBE_DEFAULT_INTERVAL: raw.PROBE_DEFAULT_INTERVAL,
  SLACK_WEBHOOK: raw.SLACK_WEBHOOK,
};

export default config;
