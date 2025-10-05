require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { connectDB } = require("./services/db");

const apisRouter = require("./routes/apis");
const metricsRouter = require("./routes/metrics");

const app = express();
app.use(cors());
app.use(express.json());

app.use("/v1/apis", apisRouter);
app.use("/v1/metrics", metricsRouter);

const port = process.env.PORT || 3000;
connectDB()
  .then(() => {
    app.listen(port, () =>
      console.log(`Ingest service running on http://localhost:${port}`)
    );
  })
  .catch((err) => {
    console.error("Failed to connect DB:", err);
    process.exit(1);
  });
