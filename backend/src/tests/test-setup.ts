// src/tests/test-setup.ts
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

let mongoServer: MongoMemoryServer;

export async function connectInMemoryMongo() {
  mongoServer = await MongoMemoryServer.create({
    instance: { dbName: "testdb" },
  });
  const uri = mongoServer.getUri();

  // use mongoose directly to connect
  await mongoose.connect(uri, {
    // options handled by mongoose default; optional to include:
    // useNewUrlParser: true,
    // useUnifiedTopology: true,
  });
  return uri;
}

export async function stopInMemoryMongo() {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
}
