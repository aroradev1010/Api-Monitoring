"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
// src/models/metric.model.ts
const mongoose_1 = __importStar(require("mongoose"));
const MetricSchema = new mongoose_1.Schema({
    api_id: { type: String, required: true, index: true },
    timestamp: { type: Date, required: true, default: Date.now },
    latency_ms: { type: Number, required: true },
    status_code: { type: Number, required: true },
    error: { type: String, default: null },
    tags: { type: mongoose_1.Schema.Types.Mixed },
});
// index for querying latest metrics by api_id quickly
MetricSchema.index({ api_id: 1, timestamp: -1 });
const Metric = mongoose_1.default.models.Metric || mongoose_1.default.model("Metric", MetricSchema);
exports.default = Metric;
//# sourceMappingURL=metric.model.js.map