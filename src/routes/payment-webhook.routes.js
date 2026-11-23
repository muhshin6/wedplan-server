import express from "express";
import { handleStripeWebhook } from "../controllers/payment.controller.js";

const router = express.Router();

// Raw body is required for Stripe signature verification.
// This route is mounted BEFORE express.json() in index.js.
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  handleStripeWebhook
);

export default router;
