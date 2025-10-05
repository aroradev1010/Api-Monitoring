"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = connectDB;
// src/services/db.ts
const mongoose_1 = __importDefault(require("mongoose"));
async function connectDB() {
    const uri = process.env.MONGO_URI || "mongodb://localhost:27017/apimon";
    // Using 'as any' for options to avoid type friction for now
    await mongoose_1.default.connect(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });
    console.log("MongoDB connected");
}
//# sourceMappingURL=db.js.map