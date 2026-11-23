import express from "express";
import cors from "cors";
import "dotenv/config";
// Local overrides (gitignored) take precedence over production .env values.
import fs from "node:fs";
if (fs.existsSync(".env.local")) {
  const dotenv = await import("dotenv");
  dotenv.config({ path: ".env.local", override: true });
}
import { connectToMongoDB } from "./config/db.js";
import healthRoutes from "./routes/health.routes.js";
import serviceRoutes from "./routes/service.routes.js";
import bookingRoutes from "./routes/booking.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./config/auth.js";
import uploadRoutes from "./routes/upload.routes.js";
import subscriptionRoutes from "./routes/subscription.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import paymentWebhookRoutes from "./routes/payment-webhook.routes.js";

const app = express();

// Middleware — allow the configured client, localhost, and any Vercel
// preview/production subdomain of the project.
const configuredOrigins = [
  "http://localhost:3000",
  process.env.CLIENT_URL?.replace(/\/$/, ""),
].filter(Boolean);

function isAllowedOrigin(origin) {
  if (!origin) return false;
  if (configuredOrigins.includes(origin)) return true;

  try {
    const url = new URL(origin);
    return url.hostname.endsWith(".vercel.app") || url.hostname === "localhost";
  } catch {
    return false;
  }
}

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || isAllowedOrigin(origin)) {
        callback(null, origin || true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);

// Better Auth Handler
app.all("/api/auth/*splat", toNodeHandler(auth));

// Stripe webhook needs the raw request body for signature verification.
app.use("/api/payment", paymentWebhookRoutes);

app.use(express.json());

// Routes
app.use("/api/health", healthRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/subscription", subscriptionRoutes);
app.use("/api/payment", paymentRoutes);

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
