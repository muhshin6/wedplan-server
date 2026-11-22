import express from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/role.middleware.js";

import {
  createService,
  deleteService,
  getVendorServices,
  getPublicServices,
  getServiceById,
  getPendingServices,
  updateService,
  updateServiceStatus,
} from "../controllers/service.controller.js";

const router = express.Router();

// Public Services
router.get("/public", getPublicServices);

// Get Single Public Service
router.get("/:id", getServiceById);

// Admin - Get Pending Services
router.get(
  "/admin/pending",
  authenticate,
  authorizeRoles("admin"),
  getPendingServices,
);

// Admin - Approve or Reject Service
router.patch(
  "/admin/:id/status",
  authenticate,
  authorizeRoles("admin"),
  updateServiceStatus
);

// Create Service - Vendor Only
router.post("/", authenticate, authorizeRoles("vendor"), createService);

// Get Vendor's Own Services
router.get(
  "/vendor/my-services",
  authenticate,
  authorizeRoles("vendor"),
  getVendorServices,
);

// Update Service - Vendor Only
router.patch("/:id", authenticate, authorizeRoles("vendor"), updateService);

// Delete Service - Vendor Only
router.delete("/:id", authenticate, authorizeRoles("vendor"), deleteService);

export default router;
