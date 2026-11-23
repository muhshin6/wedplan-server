import express from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/role.middleware.js";
import {
  getAdminStats,
  getRecentBookings,
  getAllUsers,
  setUserBlocked,
  getTransactions,
} from "../controllers/admin.controller.js";

const router = express.Router();

// Admin Dashboard Statistics
router.get("/stats", authenticate, authorizeRoles("admin"), getAdminStats);

// Admin - Get Recent Bookings
router.get(
  "/recent-bookings",
  authenticate,
  authorizeRoles("admin"),
  getRecentBookings
);

// Admin - Get All Users
router.get(
  "/users",
  authenticate,
  authorizeRoles("admin"),
  getAllUsers
);

// Admin - Platform transactions (read-only, no modification endpoint)
router.get(
  "/transactions",
  authenticate,
  authorizeRoles("admin"),
  getTransactions
);

// Admin - Block or unblock a user (server-side role verified)
router.patch(
  "/users/:id/block",
  authenticate,
  authorizeRoles("admin"),
  setUserBlocked
);

export default router;
