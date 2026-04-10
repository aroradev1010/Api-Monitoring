const express = require("express");
const { init, trackExpress, track } = require("../sdk/dist");
const { axios } = require("@api-monitor/sdk");
const app = express();

// ✅ Initialize SDK
init({
    apiKey: "test",
    service: "test-service",
    ingestUrl: "http://localhost:3000"
});

// ✅ Attach middleware
app.use(trackExpress());

// Test route
app.get("/test", async (req, res) => {
  const response = await axios.get("http://localhost:3002/pay");
  res.send("A → B success");
});

// Error route
app.get("/error", async (req, res) => {
    await track("error-operation", async () => {
        throw new Error("Test failure");
    });

    res.send("This will not execute");
});

app.listen(3001, () => {
    console.log("Test app running on port 3001");
});