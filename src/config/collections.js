import { connectToMongoDB } from "./db.js";

let db;

export async function getDB() {
  if (!db) {
    const client = await connectToMongoDB();
    db = client.db(process.env.DB_NAME);
  }

  return db;
}

export async function getCollections() {
  const database = await getDB();

  return {
    users: database.collection("user"),
    services: database.collection("services"),
    bookings: database.collection("bookings"),
    transactions: database.collection("transactions"),
  };
}
