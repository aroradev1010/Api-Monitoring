// backend/src/app.ts
import express from "express";
import cors from "cors";
import apisRouter from "./routes/apis";
import eventsRouter from "./routes/events";
import metricsRouter from "./routes/metrics";
import rulesRouter from "./routes/rules";
import alertsRouter from "./routes/alerts";
import errorHandler from "./middlewares/errorHandler";
import probeRouter from "./routes/probe";
import streamRouter from "./routes/stream";
import testRoutes from "./routes/test.routes";

const app = express();

app.use(cors());
app.use(express.json());
app.use("/v1/apis", apisRouter);
app.use("/v1/events", eventsRouter);
// DEPRECATED: /v1/metrics is kept for backward compatibility.
// Internally delegates to the Event model. Use /v1/events for new integrations.
app.use("/v1/metrics", metricsRouter);
app.use("/v1/rules", rulesRouter);
app.use("/v1/alerts", alertsRouter);
app.use("/v1/probe", probeRouter);
app.use("/v1/stream", streamRouter);
if (process.env.NODE_ENV !== "production") {
  app.use("/__test__", testRoutes);
}
// Health check endpoint
app.get("/health", (_req, res) => res.json({ status: "ok" }));

// Global error handler
app.use(errorHandler);

export default app;
