// src/index.ts
import config from "./config";
import express from "express";
import cors from "cors";
import apisRouter from "./routes/apis";
import metricsRouter from "./routes/metrics";
import { connectDB } from "./services/db";
import errorHandler from "./middlewares/errorHandler";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/v1/apis", apisRouter);
app.use("/v1/metrics", metricsRouter);
app.use(errorHandler);

const port = config.PORT;


connectDB()
  .then(() => {
    app.listen(port, () => {
      console.log(`Ingest service running on http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect DB:", err);
    process.exit(1);
  });
