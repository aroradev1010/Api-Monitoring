const express = require("express");
const { init, trackExpress } = require("@api-monitor/sdk");

const app = express();

init({
  apiKey: "test",
  service: "service-b",
  ingestUrl: "http://localhost:3000"
});

app.use(trackExpress());

app.get("/pay", async (req, res) => {
  console.log("B HIT");
  res.send("Payment success");
});

app.listen(3002, () => {
  console.log("Service B running on 3002");
});