"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/index.ts
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const apis_1 = __importDefault(require("./routes/apis"));
const metrics_1 = __importDefault(require("./routes/metrics"));
const db_1 = require("./services/db");
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use("/v1/apis", apis_1.default);
app.use("/v1/metrics", metrics_1.default);
const port = Number(process.env.PORT) || 3000;
(0, db_1.connectDB)()
    .then(() => {
    app.listen(port, () => {
        console.log(`Ingest service running on http://localhost:${port}`);
    });
})
    .catch((err) => {
    console.error("Failed to connect DB:", err);
    process.exit(1);
});
//# sourceMappingURL=index.js.map