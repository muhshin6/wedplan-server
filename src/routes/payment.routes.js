import express from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/role.middleware.js";
import {
  createCheckoutSession,
  getPaymentStatus,
  cancelSubscription,
  getMyTransactions,
} from "../controllers/payment.controller.js";

const router = express.Router();

// Vendor creates a checkout session for their own account only
router.post(
  "/create-checkout-session",
  authenticate,
  authorizeRoles("vendor"),
  createCheckoutSession
);

// Read-only payment status for the success page
router.get("/status", authenticate, getPaymentStatus);

// Vendor's own billing history (read-only)
router.get("/my-transactions", authenticate, authorizeRoles("vendor"), getMyTransactions);

// Vendor cancels their own subscription
router.post(
  "/cancel-subscription",
  authenticate,
  authorizeRoles("vendor"),
  cancelSubscription
);

export default router;
