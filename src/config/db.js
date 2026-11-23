import { MongoClient } from "mongodb";
import "dotenv/config";
import fs from "node:fs";
if (fs.existsSync(".env.local")) {
  const dotenv = await import("dotenv");
  dotenv.config({ path: ".env.local", override: true });
}

const uri = `mongodb://${process.env.DB_USER}:${process.env.DB_PASSWORD}@ac-kvzmrzd-shard-00-00.uzmnfpx.mongodb.net:27017,ac-kvzmrzd-shard-00-01.uzmnfpx.mongodb.net:27017,ac-kvzmrzd-shard-00-02.uzmnfpx.mongodb.net:27017/?ssl=true&replicaSet=atlas-idvc5w-shard-0&authSource=admin`;

export const client = new MongoClient(uri);

export async function connectToMongoDB() {
  try {
    await client.connect();

    console.log("MongoDB connected successfully!");

    return client;
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    throw error;
  }
}
