// backend/src/app.ts (small edit)
import express from "express";
import cors from "cors";
import apisRouter from "./routes/apis";
import metricsRouter from "./routes/metrics";
import rulesRouter from "./routes/rules";
import alertsRouter from "./routes/alerts";
import errorHandler from "./middlewares/errorHandler";
import probeRouter from "./routes/probe";

const app = express();

app.use(cors());
app.use(express.json());
app.use("/v1/apis", apisRouter);
app.use("/v1/metrics", metricsRouter);
app.use("/v1/rules", rulesRouter);
app.use("/v1/alerts", alertsRouter);
app.use("/v1/probe", probeRouter);
// Health check endpoint
app.get("/health", (_req, res) => res.json({ status: "ok" }));

// Global error handler
app.use(errorHandler);

export default app;
