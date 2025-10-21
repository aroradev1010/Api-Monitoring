// src/app.ts
import express from "express";
import cors from "cors";
import apisRouter from "./routes/apis";
import metricsRouter from "./routes/metrics";
import errorHandler from "./middlewares/errorHandler";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/v1/apis", apisRouter);
app.use("/v1/metrics", metricsRouter);

// Health check endpoint
app.get("/health", (_req, res) => res.json({ status: "ok" }));

// Global error handler
app.use(errorHandler);

export default app;
