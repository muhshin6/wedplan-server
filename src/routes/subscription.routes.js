import express from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import { getSubscription } from "../controllers/subscription.controller.js";

const router = express.Router();

// Current subscription for the authenticated user (read-only)
router.get("/", authenticate, getSubscription);

// NOTE: Plan activation is intentionally NOT exposed here.
// It only happens through the verified Stripe webhook at /api/payment/webhook.
// Checkout sessions are created at POST /api/payment/create-checkout-session.

export default router;
