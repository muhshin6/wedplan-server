import express from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/role.middleware.js";
import {
  getAdminStats,
  getRecentBookings,
  getAllUsers,
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
export default router;
