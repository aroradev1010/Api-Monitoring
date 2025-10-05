// src/logger/index.ts
/**
 * Logger wrapper using pino.
 * NOTE: do NOT import `config` here to avoid circular import issues.
 * Read NODE_ENV from process.env so logger can be required safely early.
 */

import pino from "pino";

const NODE_ENV = (process.env.NODE_ENV || "development") as
  | "development"
  | "production"
  | "test";
const isDev = NODE_ENV === "development";

const transport = isDev
  ? pino.transport({
      target: "pino-pretty",
      options: { colorize: true, translateTime: "SYS:standard" },
    })
  : undefined;

const logger = pino(
  {
    level: isDev ? "debug" : "info",
    base: {
      pid: process.pid,
      env: NODE_ENV,
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  transport as any
);

export default logger;
