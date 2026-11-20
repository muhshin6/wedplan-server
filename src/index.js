import express from "express";
import cors from "cors";
import "dotenv/config";
import { connectToMongoDB } from "./config/db.js";
import healthRoutes from "./routes/health.routes.js";

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/health", healthRoutes);

// Test API
app.get("/", (req, res) => {
  res.send("Welcome to WedPlan API!");
});

// Server
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await connectToMongoDB();

    app.listen(PORT, () => {
      console.log(`WedPlan server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
