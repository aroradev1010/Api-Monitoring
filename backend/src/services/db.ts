// src/services/db.ts
import mongoose from "mongoose";

export async function connectDB(): Promise<void> {
  const uri = process.env.MONGO_URI || "mongodb://localhost:27017/apimon";
  // Using 'as any' for options to avoid type friction for now
  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  } as any);
  console.log("MongoDB connected");
}
