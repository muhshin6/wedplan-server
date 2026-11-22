import express from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/role.middleware.js";
import {
  getSubscription,
  upgradeSubscription,
} from "../controllers/subscription.controller.js";

const router = express.Router();

// Current subscription for the authenticated user
router.get("/", authenticate, getSubscription);

// Vendors can change their plan (upgrade / downgrade)
router.post(
  "/upgrade",
  authenticate,
  authorizeRoles("vendor"),
  upgradeSubscription,
);

export default router;
